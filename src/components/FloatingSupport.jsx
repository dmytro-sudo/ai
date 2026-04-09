import { useState } from "react";
import { MessageCircle, X, Send, LifeBuoy } from "lucide-react";
import { base44 } from "@/api/supabaseClient";

export default function FloatingSupport() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !description) return;
    setLoading(true);
    await base44.entities.SupportTicket.create({
      subject,
      description,
      priority: "medium",
      status: "open",
      category: "general",
    });
    setLoading(false);
    setSent(true);
    setTimeout(() => { setSent(false); setSubject(""); setDescription(""); setOpen(false); }, 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border">
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Support</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-secondary">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {sent ? (
            <div className="p-6 text-center">
              <p className="text-sm font-medium text-success">✓ Ticket submitted!</p>
              <p className="text-xs text-muted-foreground mt-1">We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject..."
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none text-foreground placeholder:text-muted-foreground"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your issue..."
                rows={4}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none text-foreground placeholder:text-muted-foreground resize-none"
              />
              <button
                type="submit"
                disabled={loading || !subject || !description}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? "Sending..." : "Send"}
              </button>
            </form>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-13 h-13 w-12 h-12 rounded-full bg-primary shadow-lg hover:bg-primary/90 flex items-center justify-center transition-all"
      >
        {open ? <X className="w-5 h-5 text-primary-foreground" /> : <MessageCircle className="w-5 h-5 text-primary-foreground" />}
      </button>
    </div>
  );
}