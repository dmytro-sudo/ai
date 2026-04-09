import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { LifeBuoy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import moment from "moment";

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium", category: "general" });

  const loadTickets = () => {
    base44.entities.SupportTicket.list("-created_date", 50)
      .then(setTickets)
      .finally(() => setLoading(false));
  };

  useEffect(loadTickets, []);

  const handleSubmit = async () => {
    if (!form.subject || !form.description) return;
    setSubmitting(true);
    await base44.entities.SupportTicket.create({ ...form, status: "open" });
    setForm({ subject: "", description: "", priority: "medium", category: "general" });
    setShowForm(false);
    setSubmitting(false);
    loadTickets();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Support" subtitle="Create and track support tickets">
        <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <LifeBuoy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-medium">No tickets yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first support ticket</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-medium text-foreground">{t.subject}</h3>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="capitalize">{t.priority}</span>
                  <span>{t.category?.replace("_", " ")}</span>
                  <span>{moment(t.created_date).fromNow()}</span>
                </div>
              </div>
              {t.response && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary font-medium">Response:</span> {t.response}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">New Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="bg-background border-border"
            />
            <Textarea
              placeholder="Describe your issue..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="bg-background border-border"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} disabled={submitting || !form.subject || !form.description} className="w-full rounded-xl bg-primary hover:bg-primary/90">
              {submitting ? "Submitting..." : "Create Ticket"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}