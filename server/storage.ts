import { 
  products, type Product, type InsertProduct,
  stores, type Store, type InsertStore,
  categories, type Category, type InsertCategory,
  users, type User, type InsertUser,
  shopOwners, type ShopOwner, type InsertShopOwner,
  customers, type Customer, type InsertCustomer,
  carts, type Cart, type InsertCart,
  cartItems, type CartItem, type InsertCartItem,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Stores
  getStore(id: number): Promise<Store | undefined>;
  getStores(): Promise<Store[]>;
  getStoreByOwner(ownerId: number): Promise<Store | undefined>;
  getStoreBySlug(slug: string): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<Store>): Promise<Store | undefined>;
  deleteStore(id: number): Promise<boolean>;
  
  // Categories
  getCategories(storeId: number): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Products
  getProducts(storeId?: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Shop Owners
  getShopOwner(id: number): Promise<ShopOwner | undefined>;
  getShopOwnerByUserId(userId: number): Promise<ShopOwner | undefined>;
  createShopOwner(shopOwner: InsertShopOwner): Promise<ShopOwner>;
  updateShopOwnerSubscription(id: number, data: Partial<ShopOwner>): Promise<ShopOwner | undefined>;
  
  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByUserId(userId: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  
  // Carts
  getCart(id: number): Promise<Cart | undefined>;
  getCartByCustomer(customerId: number, storeId: number): Promise<Cart | undefined>;
  createCart(cart: InsertCart): Promise<Cart>;
  deleteCart(id: number): Promise<boolean>;
  
  // Cart Items
  getCartItems(cartId: number): Promise<CartItem[]>;
  getCartItem(id: number): Promise<CartItem | undefined>;
  createCartItem(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  deleteCartItem(id: number): Promise<boolean>;
  
  // Orders
  getOrders(storeId?: number, customerId?: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderWhatsappStatus(id: number, sent: boolean): Promise<Order | undefined>;
  
  // Order Items
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  
  // Stripe-related methods
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;
  updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<ShopOwner | undefined>;
  
  // Session
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stores: Map<number, Store>;
  private categories: Map<number, Category>;
  private products: Map<number, Product>;
  private shopOwners: Map<number, ShopOwner>;
  private customers: Map<number, Customer>;
  private carts: Map<number, Cart>;
  private cartItems: Map<number, CartItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  
  private userId: number;
  private storeId: number;
  private categoryId: number;
  private productId: number;
  private shopOwnerId: number;
  private customerId: number;
  private cartId: number;
  private cartItemId: number;
  private orderId: number;
  private orderItemId: number;
  
  public sessionStore: session.Store;
  
  // Category methods
  async getCategories(storeId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.storeId === storeId
    );
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryId++;
    const now = new Date();
    
    const newCategory: Category = { 
      ...category, 
      id,
      createdAt: now
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined> {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) {
      return undefined;
    }
    
    const updatedCategory = { ...existingCategory, ...category };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  constructor() {
    // Initialize maps
    this.users = new Map();
    this.stores = new Map();
    this.categories = new Map();
    this.products = new Map();
    this.shopOwners = new Map();
    this.customers = new Map();
    this.carts = new Map();
    this.cartItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    
    // Initialize IDs
    this.userId = 1;
    this.storeId = 1;
    this.categoryId = 1;
    this.productId = 1;
    this.shopOwnerId = 1;
    this.customerId = 1;
    this.cartId = 1;
    this.cartItemId = 1;
    this.orderId = 1;
    this.orderItemId = 1;
    
    // Criar session store para gerenciar sessões
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 horas
    });

    // Create default admin user
    const adminUser: User = {
      id: this.userId++,
      username: "admin",
      password: "$2b$10$Fh6MUHRGJDQgFRREWjGwH.zoD5mTJo/LP91zhcGWHYpO7sHBUj6T.", // "admin123"
      email: "admin@moments.com",
      name: "Administrador",
      role: "admin",
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Initialize with default store
    const defaultStore: Store = {
      id: this.storeId++,
      name: "Loja Moments Paris",
      slug: "moments",
      logoUrl: "/placeholder-logo.jpg",
      whatsappNumber: "11987654321",
      instagramUrl: null,
      facebookUrl: null,
      showSocialMedia: false,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      templateId: null
    };
    this.stores.set(defaultStore.id, defaultStore);

    // Create a default shop owner with the store
    const shopOwnerUser: User = {
      id: this.userId++,
      username: "lojista",
      password: "$2b$10$2zZREfX0Ssa81Y4PYIxlaeYMQKvagrdLWVlVQ0tXaQ7u1nU2vhSne", // "lojista123"
      email: "lojista@moments.com",
      name: "Lojista Demo",
      role: "shopowner",
      createdAt: new Date(),
    };
    this.users.set(shopOwnerUser.id, shopOwnerUser);

    const shopOwner: ShopOwner = {
      id: this.shopOwnerId++,
      userId: shopOwnerUser.id,
      storeId: defaultStore.id,
      subscriptionStatus: "trial",
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null
    };
    this.shopOwners.set(shopOwner.id, shopOwner);

    // Create default categories
    const skinCareCategory: Category = {
      id: this.categoryId++,
      name: "Cuidados com a Pele",
      storeId: defaultStore.id,
      createdAt: new Date()
    };
    this.categories.set(skinCareCategory.id, skinCareCategory);
    
    const hairCareCategory: Category = {
      id: this.categoryId++,
      name: "Cuidados com o Cabelo",
      storeId: defaultStore.id,
      createdAt: new Date()
    };
    this.categories.set(hairCareCategory.id, hairCareCategory);
    
    const perfumeCategory: Category = {
      id: this.categoryId++,
      name: "Perfumes",
      storeId: defaultStore.id,
      createdAt: new Date()
    };
    this.categories.set(perfumeCategory.id, perfumeCategory);
    
    const bodyCareCategory: Category = {
      id: this.categoryId++,
      name: "Cuidados Corporais",
      storeId: defaultStore.id,
      createdAt: new Date()
    };
    this.categories.set(bodyCareCategory.id, bodyCareCategory);

    // Initialize with sample products
    const sampleProducts = [
      {
        id: this.productId++,
        name: "Creme Hidratante Facial",
        price: 89.9,
        description: "Hidratação profunda para todos os tipos de pele. Fórmula não oleosa com vitamina E.",
        imageUrl: "/placeholder-product-1.jpg",
        storeId: defaultStore.id,
        categoryId: skinCareCategory.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.productId++,
        name: "Sérum Facial Antioxidante",
        price: 129.9,
        description: "Com vitamina C que combate os radicais livres e sinais de envelhecimento.",
        imageUrl: "/placeholder-product-2.jpg",
        storeId: defaultStore.id,
        categoryId: skinCareCategory.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.productId++,
        name: "Máscara Capilar Reparadora",
        price: 75.9,
        description: "Tratamento intensivo para cabelos danificados. Recupera a maciez e o brilho natural.",
        imageUrl: "/placeholder-product-3.jpg",
        storeId: defaultStore.id,
        categoryId: hairCareCategory.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.productId++,
        name: "Protetor Solar FPS 50",
        price: 69.9,
        description: "Proteção UVA/UVB de amplo espectro. Textura leve, não oleosa e resistente à água.",
        imageUrl: "/placeholder-product-4.jpg",
        storeId: defaultStore.id,
        categoryId: skinCareCategory.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.productId++,
        name: "Perfume Floral",
        price: 159.9,
        description: "Fragrância sofisticada com notas de jasmim, rosa e baunilha. Longa duração.",
        imageUrl: "/placeholder-product-5.jpg",
        storeId: defaultStore.id,
        categoryId: perfumeCategory.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.productId++,
        name: "Óleo Corporal Relaxante",
        price: 85.9,
        description: "Hidratação profunda com aroma terapêutico de lavanda e camomila. Ideal para massagens.",
        imageUrl: "/placeholder-product-6.jpg",
        storeId: defaultStore.id,
        categoryId: bodyCareCategory.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const product of sampleProducts) {
      this.products.set(product.id, product);
    }

    // Create a default customer user
    const customerUser: User = {
      id: this.userId++,
      username: "cliente",
      password: "$2b$10$2TYxJv7TIhCGNz5LkO18Y.8BpYU1AHVlBNrfLODmyH3RnoIQqcyEi", // "cliente123"
      email: "cliente@email.com",
      name: "Cliente Demo",
      role: "customer",
      createdAt: new Date(),
    };
    this.users.set(customerUser.id, customerUser);

    const customer: Customer = {
      id: this.customerId++,
      userId: customerUser.id,
      address: "Rua das Flores, 123, São Paulo - SP",
      phone: "11998765432"
    };
    this.customers.set(customer.id, customer);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === role
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser = { 
      ...user, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Store methods
  async getStore(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  async getStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }

  async getStoreByOwner(ownerId: number): Promise<Store | undefined> {
    const shopOwner = Array.from(this.shopOwners.values()).find(
      (owner) => owner.userId === ownerId
    );
    
    if (!shopOwner || !shopOwner.storeId) {
      return undefined;
    }
    
    return this.stores.get(shopOwner.storeId);
  }
  
  async getStoreBySlug(slug: string): Promise<Store | undefined> {
    return Array.from(this.stores.values()).find(
      (store) => store.slug === slug
    );
  }

  async createStore(store: InsertStore): Promise<Store> {
    const id = this.storeId++;
    const newStore: Store = {
      ...store,
      id,
      slug: store.slug || null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      templateId: store.templateId || null
    };
    this.stores.set(id, newStore);
    return newStore;
  }

  async updateStore(id: number, store: Partial<Store>): Promise<Store | undefined> {
    const existingStore = this.stores.get(id);
    if (!existingStore) {
      return undefined;
    }
    
    // Normalize values to ensure proper types
    const normalizedStore: Partial<Store> = {};
    
    // We'll explicitly handle each field to make sure they're properly typed
    if (store.name !== undefined) normalizedStore.name = store.name;
    if (store.slug !== undefined) normalizedStore.slug = store.slug;
    if (store.whatsappNumber !== undefined) normalizedStore.whatsappNumber = store.whatsappNumber;
    if (store.logoUrl !== undefined) normalizedStore.logoUrl = store.logoUrl; 
    if (store.instagramUrl !== undefined) normalizedStore.instagramUrl = store.instagramUrl;
    if (store.facebookUrl !== undefined) normalizedStore.facebookUrl = store.facebookUrl;
    if (store.showSocialMedia !== undefined) normalizedStore.showSocialMedia = store.showSocialMedia;
    if (store.active !== undefined) normalizedStore.active = store.active;
    if (store.templateId !== undefined) normalizedStore.templateId = store.templateId;

    console.log("Updating store:", id, "with data:", normalizedStore);
    
    const updatedStore = { 
      ...existingStore, 
      ...normalizedStore, 
      updatedAt: new Date() 
    };
    
    this.stores.set(id, updatedStore);
    return updatedStore;
  }

  async deleteStore(id: number): Promise<boolean> {
    return this.stores.delete(id);
  }

  // Product methods
  async getProducts(storeId?: number): Promise<Product[]> {
    let allProducts = Array.from(this.products.values());
    
    if (storeId) {
      return allProducts.filter(product => product.storeId === storeId);
    }
    
    return allProducts;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productId++;
    const now = new Date();
    
    const newProduct: Product = { 
      ...product, 
      id, 
      description: product.description || null, 
      imageUrl: product.imageUrl || null,
      active: true,
      createdAt: now,
      updatedAt: now
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      return undefined;
    }
    
    // Normalize values to ensure proper types
    const normalizedProduct: Partial<Product> = {};
    
    // We'll explicitly handle each field to make sure they're properly typed
    if (product.name !== undefined) normalizedProduct.name = product.name;
    if (product.price !== undefined) normalizedProduct.price = product.price;
    if (product.description !== undefined) normalizedProduct.description = product.description;
    if (product.imageUrl !== undefined) normalizedProduct.imageUrl = product.imageUrl;
    if (product.active !== undefined) normalizedProduct.active = product.active;
    if (product.categoryId !== undefined) normalizedProduct.categoryId = product.categoryId;
    
    console.log("Updating product:", id, "with data:", normalizedProduct);
    
    const updatedProduct = { 
      ...existingProduct, 
      ...normalizedProduct,
      updatedAt: new Date()
    };
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  // Shop Owner methods
  async getShopOwner(id: number): Promise<ShopOwner | undefined> {
    return this.shopOwners.get(id);
  }

  async getShopOwnerByUserId(userId: number): Promise<ShopOwner | undefined> {
    return Array.from(this.shopOwners.values()).find(
      (owner) => owner.userId === userId
    );
  }

  async createShopOwner(shopOwner: InsertShopOwner): Promise<ShopOwner> {
    const id = this.shopOwnerId++;
    const newShopOwner: ShopOwner = {
      ...shopOwner,
      id,
      subscriptionExpiresAt: shopOwner.subscriptionExpiresAt || null,
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null
    };
    this.shopOwners.set(id, newShopOwner);
    return newShopOwner;
  }

  async updateShopOwnerSubscription(id: number, data: Partial<ShopOwner>): Promise<ShopOwner | undefined> {
    const existingShopOwner = this.shopOwners.get(id);
    if (!existingShopOwner) {
      return undefined;
    }
    
    const updatedShopOwner = { ...existingShopOwner, ...data };
    this.shopOwners.set(id, updatedShopOwner);
    return updatedShopOwner;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByUserId(userId: number): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(
      (customer) => customer.userId === userId
    );
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerId++;
    const newCustomer: Customer = {
      ...customer,
      id,
      address: customer.address || null,
      phone: customer.phone || null
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) {
      return undefined;
    }
    
    const updatedCustomer = { ...existingCustomer, ...customer };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  // Cart methods
  async getCart(id: number): Promise<Cart | undefined> {
    return this.carts.get(id);
  }

  async getCartByCustomer(customerId: number, storeId: number): Promise<Cart | undefined> {
    return Array.from(this.carts.values()).find(
      (cart) => cart.customerId === customerId && cart.storeId === storeId
    );
  }

  async createCart(cart: InsertCart): Promise<Cart> {
    const id = this.cartId++;
    const now = new Date();
    
    const newCart: Cart = {
      ...cart,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.carts.set(id, newCart);
    return newCart;
  }

  async deleteCart(id: number): Promise<boolean> {
    // Também excluir todos os itens do carrinho
    Array.from(this.cartItems.values())
      .filter(item => item.cartId === id)
      .forEach(item => this.cartItems.delete(item.id));
      
    return this.carts.delete(id);
  }

  // Cart Item methods
  async getCartItems(cartId: number): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(
      (item) => item.cartId === cartId
    );
  }

  async getCartItem(id: number): Promise<CartItem | undefined> {
    return this.cartItems.get(id);
  }

  async createCartItem(cartItem: InsertCartItem): Promise<CartItem> {
    const id = this.cartItemId++;
    
    const newCartItem: CartItem = {
      ...cartItem,
      id
    };
    this.cartItems.set(id, newCartItem);
    
    // Atualizar o updatedAt do carrinho
    const cart = this.carts.get(cartItem.cartId);
    if (cart) {
      cart.updatedAt = new Date();
      this.carts.set(cart.id, cart);
    }
    
    return newCartItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const existingCartItem = this.cartItems.get(id);
    if (!existingCartItem) {
      return undefined;
    }
    
    const updatedCartItem = { ...existingCartItem, quantity };
    this.cartItems.set(id, updatedCartItem);
    
    // Atualizar o updatedAt do carrinho
    const cart = this.carts.get(existingCartItem.cartId);
    if (cart) {
      cart.updatedAt = new Date();
      this.carts.set(cart.id, cart);
    }
    
    return updatedCartItem;
  }

  async deleteCartItem(id: number): Promise<boolean> {
    const cartItem = this.cartItems.get(id);
    if (!cartItem) {
      return false;
    }
    
    // Atualizar o updatedAt do carrinho
    const cart = this.carts.get(cartItem.cartId);
    if (cart) {
      cart.updatedAt = new Date();
      this.carts.set(cart.id, cart);
    }
    
    return this.cartItems.delete(id);
  }

  // Order methods
  async getOrders(storeId?: number, customerId?: number): Promise<Order[]> {
    let orders = Array.from(this.orders.values());
    
    if (storeId) {
      orders = orders.filter(order => order.storeId === storeId);
    }
    
    if (customerId) {
      orders = orders.filter(order => order.customerId === customerId);
    }
    
    return orders;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderId++;
    
    const newOrder: Order = {
      ...order,
      id,
      customerPhone: order.customerPhone || null,
      customerAddress: order.customerAddress || null,
      notes: order.notes || null,
      whatsappSent: false,
      createdAt: new Date()
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrderWhatsappStatus(id: number, sent: boolean): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      return undefined;
    }
    
    const updatedOrder = { ...existingOrder, whatsappSent: sent };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Order Item methods
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId
    );
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemId++;
    
    const newOrderItem: OrderItem = {
      ...orderItem,
      id
    };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }

  // Stripe-related methods
  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Note: na verdade estamos apenas atualizando o shopOwner, não o user
    const shopOwner = await this.getShopOwnerByUserId(userId);
    if (shopOwner) {
      shopOwner.stripeCustomerId = stripeCustomerId;
      this.shopOwners.set(shopOwner.id, shopOwner);
    }
    
    return user;
  }

  async updateUserStripeInfo(userId: number, info: { customerId: string, subscriptionId: string }): Promise<ShopOwner | undefined> {
    const shopOwner = await this.getShopOwnerByUserId(userId);
    if (!shopOwner) {
      return undefined;
    }
    
    shopOwner.stripeCustomerId = info.customerId;
    shopOwner.stripeSubscriptionId = info.subscriptionId;
    shopOwner.subscriptionStatus = "active";
    shopOwner.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 dias
    
    this.shopOwners.set(shopOwner.id, shopOwner);
    return shopOwner;
  }
}

export const storage = new MemStorage();
