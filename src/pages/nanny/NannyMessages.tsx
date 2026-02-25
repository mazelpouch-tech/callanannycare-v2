import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, ArrowLeft, Users, ShieldCheck } from "lucide-react";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";

export default function NannyMessages() {
  const {
    nannyProfile,
    chatChannels,
    chatMessages,
    activeChannel,
    fetchChatChannels,
    fetchChatMessages,
    sendChatMessage,
    markChatRead,
    setActiveChannel,
  } = useData();
  const { t } = useLanguage();

  const [input, setInput] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Nanny sees: group_all + dm_<myId>
  const myDmChannel = nannyProfile ? `dm_${nannyProfile.id}` : null;

  const channels = [
    { channel: "group_all", name: "Group Chat", subtitle: "All nannies + Admin" },
    ...(myDmChannel ? [{ channel: myDmChannel, name: "Admin", subtitle: "Private message" }] : []),
  ];

  // Initial load + polling
  useEffect(() => {
    fetchChatChannels();
    const interval = setInterval(fetchChatChannels, 10000);
    return () => clearInterval(interval);
  }, [fetchChatChannels]);

  // Fetch messages when channel changes
  useEffect(() => {
    if (!activeChannel) return;
    fetchChatMessages(activeChannel);
    markChatRead(activeChannel);
    const interval = setInterval(() => fetchChatMessages(activeChannel), 5000);
    return () => clearInterval(interval);
  }, [activeChannel, fetchChatMessages, markChatRead]);

  const currentMessages = activeChannel ? (chatMessages[activeChannel] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeChannel) return;
    const text = input.trim();
    setInput("");
    await sendChatMessage(activeChannel, text);
    inputRef.current?.focus();
  }, [input, activeChannel, sendChatMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectChannel = (channel: string) => {
    setActiveChannel(channel);
    setShowSidebar(false);
  };

  const getUnread = (channel: string) => {
    const ch = chatChannels.find((c) => c.channel === channel);
    return ch?.unreadCount || 0;
  };

  const getLastMessage = (channel: string) => {
    const ch = chatChannels.find((c) => c.channel === channel);
    if (!ch?.lastMessage) return null;
    return { text: ch.lastMessage, sender: ch.lastSender, at: ch.lastAt };
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "now";
      if (diffMin < 60) return `${diffMin}m`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h`;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getChannelName = (channel: string) => {
    const found = channels.find((c) => c.channel === channel);
    return found?.name || channel;
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          {t("nanny.messages.title") !== "nanny.messages.title" ? t("nanny.messages.title") : "Messages"}
        </h1>
      </div>

      <div className="flex-1 flex bg-card rounded-xl border border-border overflow-hidden min-h-0">
        {/* Sidebar */}
        <div
          className={`${
            showSidebar ? "flex" : "hidden lg:flex"
          } flex-col w-full lg:w-80 border-r border-border bg-card shrink-0`}
        >
          <div className="flex-1 overflow-y-auto">
            {channels.map((ch) => {
              const unread = getUnread(ch.channel);
              const last = getLastMessage(ch.channel);
              const isGroup = ch.channel === "group_all";
              const isActive = activeChannel === ch.channel;

              return (
                <button
                  key={ch.channel}
                  onClick={() => selectChannel(ch.channel)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 ${
                    isActive ? "bg-accent/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isGroup ? "bg-primary/10 text-primary" : "gradient-warm"
                    }`}
                  >
                    {isGroup ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {ch.name}
                      </span>
                      {last?.at && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {formatTime(last.at)}
                        </span>
                      )}
                    </div>
                    {last?.text ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {last.sender ? `${last.sender}: ` : ""}
                        {last.text}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                        {ch.subtitle}
                      </p>
                    )}
                  </div>
                  {unread > 0 && (
                    <span className="bg-accent text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div
          className={`${
            !showSidebar ? "flex" : "hidden lg:flex"
          } flex-1 flex-col min-w-0`}
        >
          {activeChannel ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                <button
                  onClick={() => {
                    setShowSidebar(true);
                    setActiveChannel(null);
                  }}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    activeChannel === "group_all"
                      ? "bg-primary/10 text-primary"
                      : "gradient-warm"
                  }`}
                >
                  {activeChannel === "group_all" ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {getChannelName(activeChannel)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {activeChannel === "group_all" ? "All nannies + Admin" : "Private message"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {currentMessages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start the conversation</p>
                    </div>
                  </div>
                )}
                {currentMessages.map((msg) => {
                  const isMe =
                    msg.senderType === "nanny" &&
                    msg.senderId === nannyProfile?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[75%]">
                        {!isMe && activeChannel === "group_all" && (
                          <p className="text-[10px] text-muted-foreground mb-0.5 px-1">
                            {msg.senderName}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm ${
                            isMe
                              ? "bg-accent text-white rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                        <p
                          className={`text-[10px] text-muted-foreground mt-0.5 ${
                            isMe ? "text-right" : "text-left"
                          } px-1`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border bg-card">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
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
                <p className="text-sm mt-1">Choose a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
