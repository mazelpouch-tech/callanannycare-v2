import { useState, useEffect, useRef, useMemo } from "react";
import { MessageCircle, Send, ArrowLeft, Search, ShieldCheck } from "lucide-react";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";
import type { ChatMessage } from "../../types";

interface AdminPreview {
  adminId: number;
  adminName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function NannyMessages() {
  const { chatMessages, sendChatMessage, markChatMessagesRead, nannyProfile, adminUsers, fetchAdminUsers } = useData();
  const { t } = useLanguage();
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const nannyId = nannyProfile?.id ?? 0;

  // Load admin users so we can show admin names
  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  // Build admin conversation previews
  const conversations: AdminPreview[] = useMemo(() => {
    const adminMap = new Map<number, ChatMessage[]>();

    for (const msg of chatMessages) {
      // Only messages involving this nanny
      if (msg.senderType === "nanny" && msg.senderId !== nannyId) continue;
      if (msg.recipientType === "nanny" && msg.recipientId !== nannyId) continue;
      if (msg.senderType !== "nanny" && msg.recipientType !== "nanny") continue;

      let adminId: number | null = null;
      if (msg.senderType === "admin") adminId = msg.senderId;
      else if (msg.recipientType === "admin") adminId = msg.recipientId;
      if (adminId === null) continue;

      if (!adminMap.has(adminId)) adminMap.set(adminId, []);
      adminMap.get(adminId)!.push(msg);
    }

    // Add admins that nanny hasn't chatted with yet
    for (const admin of adminUsers) {
      if (!adminMap.has(admin.id)) adminMap.set(admin.id, []);
    }

    const previews: AdminPreview[] = [];
    for (const [adminId, msgs] of adminMap) {
      const admin = adminUsers.find((a) => a.id === adminId);
      const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const last = sorted[sorted.length - 1];
      const unread = msgs.filter((m) => m.recipientType === "nanny" && m.recipientId === nannyId && !m.isRead).length;

      previews.push({
        adminId,
        adminName: admin?.name || last?.senderName || "Admin",
        lastMessage: last?.content || "",
        lastMessageTime: last?.createdAt || "",
        unreadCount: unread,
      });
    }

    return previews.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.adminName.localeCompare(b.adminName);
    });
  }, [chatMessages, adminUsers, nannyId]);

  // Auto-select if only one admin
  useEffect(() => {
    if (!selectedAdminId && conversations.length === 1) {
      setSelectedAdminId(conversations[0].adminId);
    }
  }, [conversations, selectedAdminId]);

  // Messages for selected conversation
  const conversationMessages = useMemo(() => {
    if (!selectedAdminId) return [];
    return chatMessages
      .filter((m) =>
        ((m.senderType === "admin" && m.senderId === selectedAdminId && m.recipientType === "nanny" && m.recipientId === nannyId) ||
         (m.senderType === "nanny" && m.senderId === nannyId && m.recipientType === "admin" && m.recipientId === selectedAdminId))
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [chatMessages, selectedAdminId, nannyId]);

  // Mark messages as read
  useEffect(() => {
    if (!selectedAdminId) return;
    const unread = conversationMessages
      .filter((m) => m.recipientType === "nanny" && m.recipientId === nannyId && !m.isRead)
      .map((m) => m.id);
    if (unread.length > 0) markChatMessagesRead(unread);
  }, [conversationMessages, selectedAdminId, nannyId, markChatMessagesRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages.length]);

  useEffect(() => {
    if (selectedAdminId) inputRef.current?.focus();
  }, [selectedAdminId]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedAdminId) return;
    sendChatMessage("admin", selectedAdminId, messageText.trim());
    setMessageText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedAdmin = adminUsers.find((a) => a.id === selectedAdminId);

  const filteredConversations = search
    ? conversations.filter((c) => c.adminName.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  function formatTime(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          {t("nanny.messages.title") !== "nanny.messages.title" ? t("nanny.messages.title") : "Messages"}
        </h1>
      </div>

      <div className="flex-1 flex bg-card rounded-xl border border-border overflow-hidden min-h-0">
        {/* Conversation List */}
        <div className={`w-full sm:w-80 lg:w-96 border-r border-border flex flex-col shrink-0 ${selectedAdminId ? "hidden sm:flex" : "flex"}`}>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.adminId}
                  onClick={() => setSelectedAdminId(conv.adminId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 ${
                    selectedAdminId === conv.adminId ? "bg-accent/5" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full gradient-warm flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">
                      {conv.adminName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">{conv.adminName}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      </div>
                      {conv.lastMessageTime && (
                        <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(conv.lastMessageTime)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage || "Start a conversation..."}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-accent text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedAdminId ? "hidden sm:flex" : "flex"}`}>
          {selectedAdminId ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                <button
                  onClick={() => setSelectedAdminId(null)}
                  className="sm:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full gradient-warm flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">
                    {(selectedAdmin?.name || "A").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">{selectedAdmin?.name || "Admin"}</p>
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Admin Team</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversationMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No messages yet. Say hello!</p>
                    </div>
                  </div>
                ) : (
                  conversationMessages.map((msg) => {
                    const isMe = msg.senderType === "nanny";
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isMe
                            ? "bg-accent text-white rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-border p-3 bg-card">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 text-sm rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim()}
                    className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose an admin to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
