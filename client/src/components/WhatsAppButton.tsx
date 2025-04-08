import { FaWhatsapp } from "react-icons/fa";
import { createWhatsAppLink } from "@/lib/utils";

interface WhatsAppButtonProps {
  whatsappNumber: string;
}

export default function WhatsAppButton({ whatsappNumber }: WhatsAppButtonProps) {
  const handleClick = () => {
    const message = `Olá! Gostaria de saber mais sobre os produtos.`;
    window.open(createWhatsAppLink(whatsappNumber, message), "_blank");
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={handleClick}
        className="flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#128C7E] transition-colors"
        aria-label="Contato via WhatsApp"
      >
        <FaWhatsapp className="text-2xl" />
      </button>
    </div>
  );
}
