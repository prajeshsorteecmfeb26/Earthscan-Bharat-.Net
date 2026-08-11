import React, { useState, useEffect, useRef, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import {
    Box,
    IconButton,
    Paper,
    Typography,
    TextField,
    Avatar,
    CircularProgress,
    Zoom,
    Fab
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export default function KrishiMitraChat() {
    const { t, i18n } = useTranslation();
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const activeUserId = user?.id || user?.Id || user?.userId || 1;

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Initial welcome message matching screenshot style
            const welcomeText = i18n.language === 'mr' 
                ? 'नमस्कार! मी कृषी मित्र आहे. मी तुम्हाला शेती, हवामान, माती आणि सरकारी योजनांबद्दल कशी मदत करू?' 
                : i18n.language === 'hi'
                ? 'नमस्ते! मैं कृषि मित्र हूँ। मैं आपको खेती, मौसम, मिट्टी और सरकारी योजनाओं के बारे में कैसे मदद कर सकता हूँ?'
                : 'Hello! I am Krishi Mitra, your AI agriculture advisor. How can I assist you with farming, weather, soil, or government schemes today?';
            
            setMessages([{
                id: 'welcome',
                text: welcomeText,
                sender: 'ai',
                timestamp: new Date()
            }]);
        }
    }, [isOpen, i18n.language]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleClearChat = () => {
        const welcomeText = i18n.language === 'mr' 
            ? 'नमस्कार! मी कृषी मित्र आहे. मी तुम्हाला शेती, हवामान, माती आणि सरकारी योजनांबद्दल कशी मदत करू?' 
            : i18n.language === 'hi'
            ? 'नमस्ते! मैं कृषि मित्र हूँ। मैं आपको खेती, मौसम, मिट्टी और सरकारी योजनाओं के बारे में कैसे मदद कर सकता हूँ?'
            : 'Hello! I am Krishi Mitra, your AI agriculture advisor. How can I assist you with farming, weather, soil, or government schemes today?';

        setMessages([{
            id: 'welcome-' + Date.now(),
            text: welcomeText,
            sender: 'ai',
            timestamp: new Date()
        }]);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || sending) return;

        const userMsgText = input.trim();
        setInput('');
        setSending(true);

        // Add user message to UI
        const userMsg = {
            id: Date.now().toString(),
            text: userMsgText,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: activeUserId,
                    question: userMsgText,
                    location: user?.location || user?.Location || 'Jalna, Maharashtra',
                    soilInfo: 'Black Soil',
                    weatherInfo: 'Partly Cloudy, 28°C',
                    lang: i18n.language || 'en'
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiMsg = {
                    id: (Date.now() + 1).toString(),
                    text: data.answer || "I am here to assist you with your farming queries.",
                    sender: 'ai',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                throw new Error('Failed to get answer');
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errMsg = {
                id: (Date.now() + 1).toString(),
                text: "🌱 **Krishi Mitra Advice:**\n\n• For fertilizer recommendations, NPK optimization, or leaf disease scanning, you can use the **Crop & Fertilizer** tool.\n• Ensure balanced irrigation based on current weather conditions in your region.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setSending(false);
        }
    };

    if (!user) return null; // Chat available for logged-in users

    return (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
            {/* Floating Toggle Button */}
            <Fab 
                aria-label="chat" 
                onClick={() => setIsOpen(!isOpen)}
                sx={{ 
                    bgcolor: '#00e676', 
                    color: '#0f172a',
                    '&:hover': { bgcolor: '#00c853' },
                    boxShadow: '0 4px 20px rgba(0, 230, 118, 0.4)',
                    width: 56,
                    height: 56
                }}
            >
                {isOpen ? <CloseIcon sx={{ fontSize: 26 }} /> : <ChatIcon sx={{ fontSize: 26 }} />}
            </Fab>

            {/* Chat Dialog Widget Matching Screenshot */}
            <Zoom in={isOpen}>
                <Paper
                    elevation={12}
                    sx={{
                        position: 'absolute',
                        bottom: 72,
                        right: 0,
                        width: { xs: '320px', sm: '380px' },
                        height: '520px',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: 'rgba(15, 23, 42, 0.96)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* Header */}
                    <Box sx={{ p: 2, bgcolor: 'rgba(0, 230, 118, 0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#00e676', width: 38, height: 38 }}>
                            <SmartToyIcon sx={{ color: '#0f172a', fontSize: 22 }} />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: '#fff' }}>
                                Krishi Mitra AI
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#00e676', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '11px' }}>
                                <Box component="span" sx={{ width: 6, height: 6, bgcolor: '#00e676', borderRadius: '50%', display: 'inline-block' }} />
                                online
                            </Typography>
                        </Box>
                        <IconButton size="small" title="Clear Chat" onClick={handleClearChat} sx={{ color: '#a0aec0', '&:hover': { color: '#ff5252' } }}>
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Close" onClick={() => setIsOpen(false)} sx={{ color: '#a0aec0', '&:hover': { color: '#fff' } }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Messages List */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {messages.map((msg) => {
                            const isAI = msg.sender === 'ai';
                            return (
                                <Box 
                                    key={msg.id} 
                                    sx={{ 
                                        display: 'flex', 
                                        flexDirection: isAI ? 'row' : 'row-reverse', 
                                        alignItems: 'flex-start',
                                        gap: 1.2,
                                        alignSelf: isAI ? 'flex-start' : 'flex-end',
                                        maxWidth: '88%'
                                    }}
                                >
                                    <Avatar 
                                        sx={{ 
                                            width: 30, 
                                            height: 30, 
                                            bgcolor: isAI ? '#00e676' : '#2979ff', 
                                            mt: 0.5,
                                            flexShrink: 0
                                        }}
                                    >
                                        {isAI ? <SmartToyIcon sx={{ fontSize: 18, color: '#0f172a' }} /> : <PersonIcon sx={{ fontSize: 18, color: '#fff' }} />}
                                    </Avatar>
                                    <Box>
                                        <Paper
                                            sx={{
                                                p: 1.5,
                                                borderRadius: isAI ? '0 12px 12px 12px' : '12px 0 12px 12px',
                                                bgcolor: isAI ? 'rgba(255,255,255,0.06)' : '#2979ff',
                                                color: '#fff',
                                                border: isAI ? '1px solid rgba(255,255,255,0.08)' : 'none'
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word', fontSize: '13.5px', lineHeight: 1.5 }}>
                                                {msg.text}
                                            </Typography>
                                        </Paper>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mt: 0.5, fontSize: '10px', textAlign: isAI ? 'left' : 'right' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                        {sending && (
                            <Box sx={{ display: 'flex', gap: 1.2, alignSelf: 'flex-start', maxWidth: '88%' }}>
                                <Avatar sx={{ width: 30, height: 30, bgcolor: '#00e676', mt: 0.5 }}>
                                    <SmartToyIcon sx={{ fontSize: 18, color: '#0f172a' }} />
                                </Avatar>
                                <Paper sx={{ p: 1.5, borderRadius: '0 12px 12px 12px', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <CircularProgress size={16} sx={{ color: '#00e676' }} />
                                </Paper>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input Area */}
                    <Box component="form" onSubmit={handleSend} sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={i18n.language === 'mr' ? 'प्रश्न विचारा...' : i18n.language === 'hi' ? 'प्रश्न पूछें...' : 'Ask Krishi Mitra...'}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={sending}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    borderRadius: '24px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    fontSize: '13.5px',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                                    '&:hover fieldset': { borderColor: '#00e676' },
                                    '&.Mui-focused fieldset': { borderColor: '#00e676' }
                                },
                            }}
                        />
                        <IconButton type="submit" disabled={!input.trim() || sending} sx={{ color: '#00e676', '&:disabled': { color: 'rgba(255,255,255,0.2)' } }}>
                            <SendIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Box>
                </Paper>
            </Zoom>
        </Box>
    );
}
