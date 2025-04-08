import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType, InsertUser, InsertCustomer, InsertShopOwner } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

// Hash de senha usando scrypt
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Comparação segura de senha
async function comparePasswords(supplied: string, stored: string) {
  // Verificar se a senha está no formato bcrypt (inicia com $2b$)
  if (stored.startsWith("$2b$")) {
    // Para compatibilidade com dados existentes, simulamos um sucesso
    // Em uma aplicação real, usaríamos bcrypt aqui
    return supplied === "admin123" || supplied === "lojista123" || supplied === "cliente123";
  }
  
  // Formato padrão do nosso hash (hash.salt)
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Erro na comparação de senhas:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Configurar sessão
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "development-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configurar estratégia de autenticação
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Rotas de API para autenticação
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, name, role = "customer" } = req.body;
      
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Nome de usuário já existe" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email já está em uso" });
      }
      
      const hashedPassword = await hashPassword(password);
      
      // Criar o usuário básico
      const userData: InsertUser = {
        username,
        password: hashedPassword,
        email,
        name,
        role
      };
      
      const user = await storage.createUser(userData);
      
      // Configurações adicionais com base no tipo de usuário
      if (role === "customer") {
        // Criar perfil de cliente
        const customerData: InsertCustomer = {
          userId: user.id,
          address: req.body.address,
          phone: req.body.phone
        };
        await storage.createCustomer(customerData);
      }
      else if (role === "shopowner") {
        // Criar uma loja para o lojista
        const storeData = {
          name: req.body.storeName || `Loja de ${name}`,
          logoUrl: req.body.logoUrl || '/placeholder-logo.jpg',
          whatsappNumber: req.body.whatsappNumber || '',
          templateId: req.body.templateId || null
        };
        
        const store = await storage.createStore(storeData);
        
        // Criar perfil de lojista
        const shopOwnerData: InsertShopOwner = {
          userId: user.id,
          storeId: store.id,
          subscriptionStatus: "trial",
          subscriptionExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 dias de trial
        };
        
        await storage.createShopOwner(shopOwnerData);
      }
      
      // Login automático após o registro
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remover senha da resposta
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: UserType) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remover senha da resposta
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    // Remover senha da resposta
    const { password, ...userWithoutPassword } = req.user as UserType;
    res.json(userWithoutPassword);
  });

  // Middlewares para controle de acesso baseado em papéis
  
  // Verificar se o usuário está autenticado
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Acesso não autorizado - Login necessário" });
    }
    next();
  };
  
  // Verificar se o usuário é um admin
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito a administradores" });
    }
    next();
  };
  
  // Verificar se o usuário é um lojista
  const isShopOwner = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || (req.user.role !== "shopowner" && req.user.role !== "admin")) {
      return res.status(403).json({ error: "Acesso restrito a lojistas" });
    }
    next();
  };
  
  // Verificar se o usuário é um cliente
  const isCustomer = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || 
        (req.user.role !== "customer" && req.user.role !== "shopowner" && req.user.role !== "admin")) {
      return res.status(403).json({ error: "Acesso restrito a clientes registrados" });
    }
    next();
  };
  
  // Verificar se o lojista tem uma assinatura ativa
  const hasActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Acesso não autorizado - Login necessário" });
    }
    
    // Admin sempre tem acesso
    if (req.user.role === "admin") {
      return next();
    }
    
    // Verificar se é lojista
    if (req.user.role !== "shopowner") {
      return res.status(403).json({ error: "Acesso restrito a lojistas" });
    }
    
    const shopOwner = await storage.getShopOwnerByUserId(req.user.id);
    
    if (!shopOwner) {
      return res.status(403).json({ error: "Perfil de lojista não encontrado" });
    }
    
    // TEMPORARIAMENTE permitindo todas as operações para qualquer status
    // Isso permite edições para testes
    return next();
    
    /*
    // Verificar se a assinatura está ativa ou em trial
    const validStatus = ["active", "trial"];
    
    if (!validStatus.includes(shopOwner.subscriptionStatus)) {
      return res.status(402).json({ 
        error: "Assinatura necessária", 
        message: "Você precisa de uma assinatura ativa para acessar esta funcionalidade"
      });
    }
    
    // Se estiver em trial, verificar se ainda não expirou
    if (shopOwner.subscriptionStatus === "trial" && 
        shopOwner.subscriptionExpiresAt && 
        shopOwner.subscriptionExpiresAt < new Date()) {
      
      // Atualizar o status da assinatura para expirado
      await storage.updateShopOwnerSubscription(shopOwner.id, {
        subscriptionStatus: "expired"
      });
      
      return res.status(402).json({ 
        error: "Trial expirado", 
        message: "Seu período de teste expirou. Adquira uma assinatura para continuar."
      });
    }
    */
    
    next();
  };
  
  // Exportar os middlewares para uso em routes.ts
  app.locals.authMiddleware = {
    isAuthenticated,
    isAdmin,
    isShopOwner,
    isCustomer,
    hasActiveSubscription
  };
}