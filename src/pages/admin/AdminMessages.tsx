import { useState, useEffect, useRef, useMemo } from "react";
import { MessageCircle, Send, ArrowLeft, Search, UserCircle } from "lucide-react";
import { useData } from "../../context/DataContext";
import type { ChatMessage } from "../../types";

interface ConversationPreview {
  nannyId: number;
  nannyName: string;
  nannyImage: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function AdminMessages() {
  const { nannies, chatMessages, sendChatMessage, markChatMessagesRead, adminProfile } = useData();
  const [selectedNannyId, setSelectedNannyId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const adminId = adminProfile?.id ?? 0;

  // Build conversation previews from messages
  const conversations: ConversationPreview[] = useMemo(() => {
    const nannyMap = new Map<number, ChatMessage[]>();

    for (const msg of chatMessages) {
      let nannyId: number | null = null;
      if (msg.senderType === "nanny") nannyId = msg.senderId;
      else if (msg.recipientType === "nanny") nannyId = msg.recipientId;
      if (nannyId === null) continue;

      if (!nannyMap.has(nannyId)) nannyMap.set(nannyId, []);
      nannyMap.get(nannyId)!.push(msg);
    }

    // Also add nannies with no messages yet so admin can start new chats
    for (const n of nannies.filter((n) => n.status === "active")) {
      if (!nannyMap.has(n.id)) nannyMap.set(n.id, []);
    }

    const previews: ConversationPreview[] = [];
    for (const [nannyId, msgs] of nannyMap) {
      const nanny = nannies.find((n) => n.id === nannyId);
      if (!nanny) continue;

      const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const last = sorted[sorted.length - 1];
      const unread = msgs.filter((m) => m.recipientType === "admin" && m.recipientId === adminId && !m.isRead).length;

      previews.push({
        nannyId,
        nannyName: nanny.name,
        nannyImage: nanny.image || "",
        lastMessage: last?.content || "",
        lastMessageTime: last?.createdAt || "",
        unreadCount: unread,
      });
    }

    // Sort: conversations with messages first (most recent on top), then alphabetical
    return previews.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.nannyName.localeCompare(b.nannyName);
    });
  }, [chatMessages, nannies, adminId]);

  // Messages for selected conversation
  const conversationMessages = useMemo(() => {
    if (!selectedNannyId) return [];
    return chatMessages
      .filter((m) =>
        (m.senderType === "nanny" && m.senderId === selectedNannyId) ||
        (m.recipientType === "nanny" && m.recipientId === selectedNannyId)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [chatMessages, selectedNannyId]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (!selectedNannyId) return;
    const unread = conversationMessages
      .filter((m) => m.recipientType === "admin" && m.recipientId === adminId && !m.isRead)
      .map((m) => m.id);
    if (unread.length > 0) markChatMessagesRead(unread);
  }, [conversationMessages, selectedNannyId, adminId, markChatMessagesRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages.length]);

  // Focus input when selecting a nanny
  useEffect(() => {
    if (selectedNannyId) inputRef.current?.focus();
  }, [selectedNannyId]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedNannyId) return;
    sendChatMessage("nanny", selectedNannyId, messageText.trim());
    setMessageText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedNanny = nannies.find((n) => n.id === selectedNannyId);

  const filteredConversations = search
    ? conversations.filter((c) => c.nannyName.toLowerCase().includes(search.toLowerCase()))
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Messages</h1>
      </div>

      <div className="flex-1 flex bg-card rounded-xl border border-border overflow-hidden min-h-0">
        {/* Conversation List */}
        <div className={`w-full sm:w-80 lg:w-96 border-r border-border flex flex-col shrink-0 ${selectedNannyId ? "hidden sm:flex" : "flex"}`}>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search nannies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                  key={conv.nannyId}
                  onClick={() => setSelectedNannyId(conv.nannyId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 ${
                    selectedNannyId === conv.nannyId ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {conv.nannyImage ? (
                      <img src={conv.nannyImage} alt={conv.nannyName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <UserCircle className="w-6 h-6 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{conv.nannyName}</span>
                      {conv.lastMessageTime && (
                        <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(conv.lastMessageTime)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage || "Start a conversation..."}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0">
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
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedNannyId ? "hidden sm:flex" : "flex"}`}>
          {selectedNannyId && selectedNanny ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                <button
                  onClick={() => setSelectedNannyId(null)}
                  className="sm:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedNanny.image ? (
                    <img src={selectedNanny.image} alt={selectedNanny.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <UserCircle className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedNanny.name}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedNanny.location}</p>
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
                    const isMe = msg.senderType === "admin";
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isMe
                            ? "bg-primary text-white rounded-br-md"
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
                    className="flex-1 px-4 py-2.5 text-sm rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim()}
                    className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
                <p className="text-sm mt-1">Choose a nanny to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
