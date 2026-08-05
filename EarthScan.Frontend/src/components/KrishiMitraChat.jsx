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
    Badge,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Zoom,
    Fab
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

export default function KrishiMitraChat() {
    const { t, i18n } = useTranslation();
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const userId = user?.id || user?.Id;

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Initial welcome message
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
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || sending || !userId) return;

        const userMsgText = input;
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
                    userId: userId,
                    question: userMsgText,
                    location: user?.location || user?.Location || 'Pune, Maharashtra',
                    soilInfo: 'Black Soil',
                    weatherInfo: 'Partly Cloudy, 28°C',
                    lang: i18n.language
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiMsg = {
                    id: (Date.now() + 1).toString(),
                    text: data.answer,
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
                text: t('profile.error_load', 'Something went wrong. Please check your connection.'),
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setSending(false);
        }
    };

    if (!user) return null; // Chat only available to logged-in users

    return (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
            {/* Toggle Button */}
            <Fab 
                color="success" 
                aria-label="chat" 
                onClick={() => setIsOpen(!isOpen)}
                sx={{ 
                    bgcolor: '#00e676', 
                    color: '#0f172a',
                    '&:hover': { bgcolor: '#00c853' },
                    boxShadow: '0 4px 20px rgba(0, 230, 118, 0.4)'
                }}
            >
                {isOpen ? <CloseIcon /> : <ChatIcon />}
            </Fab>

            {/* Chat Dialog */}
            <Zoom in={isOpen}>
                <Paper
                    elevation={6}
                    sx={{
                        position: 'absolute',
                        bottom: 80,
                        right: 0,
                        width: { xs: '320px', sm: '380px' },
                        height: '480px',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff'
                    }}
                >
                    {/* Header */}
                    <Box sx={{ p: 2, bgcolor: 'rgba(0, 230, 118, 0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#00e676', width: 36, height: 36 }}>
                            <SmartToyIcon sx={{ color: '#0f172a' }} />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                Krishi Mitra AI
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#00e676', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="span" sx={{ width: 6, height: 6, bgcolor: '#00e676', borderRadius: '50%', display: 'inline-block' }} />
                                Online
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: '#a0aec0' }}>
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
                                        gap: 1.5,
                                        alignSelf: isAI ? 'flex-start' : 'flex-end',
                                        maxWidth: '85%'
                                    }}
                                >
                                    <Avatar 
                                        sx={{ 
                                            width: 28, 
                                            height: 28, 
                                            bgcolor: isAI ? '#00e676' : '#2979ff', 
                                            mt: 0.5,
                                            fontSize: '14px' 
                                        }}
                                    >
                                        {isAI ? <SmartToyIcon sx={{ fontSize: 16, color: '#0f172a' }} /> : <PersonIcon sx={{ fontSize: 16, color: '#fff' }} />}
                                    </Avatar>
                                    <Box>
                                        <Paper
                                            sx={{
                                                p: 1.5,
                                                borderRadius: isAI ? '0 12px 12px 12px' : '12px 0 12px 12px',
                                                bgcolor: isAI ? 'rgba(255,255,255,0.05)' : '#2979ff',
                                                color: '#fff',
                                                border: isAI ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word', fontSize: '13.5px' }}>
                                                {msg.text}
                                            </Typography>
                                        </Paper>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', display: 'block', mt: 0.5, textAlign: isAI ? 'left' : 'right' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                        {sending && (
                            <Box sx={{ display: 'flex', gap: 1.5, alignSelf: 'flex-start', maxWidth: '85%' }}>
                                <Avatar sx={{ width: 28, height: 28, bgcolor: '#00e676', mt: 0.5 }}>
                                    <SmartToyIcon sx={{ fontSize: 16, color: '#0f172a' }} />
                                </Avatar>
                                <Paper sx={{ p: 1.5, borderRadius: '0 12px 12px 12px', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <CircularProgress size={16} color="success" />
                                </Paper>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input Field */}
                    <Box component="form" onSubmit={handleSend} sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={i18n.language === 'mr' ? 'प्रश्न विचारा...' : i18n.language === 'hi' ? 'प्रश्न पूछें...' : 'Ask a question...'}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={sending}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    borderRadius: '24px',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover fieldset': { borderColor: '#00e676' },
                                },
                            }}
                        />
                        <IconButton type="submit" disabled={!input.trim() || sending} sx={{ color: '#00e676', '&:disabled': { color: 'rgba(255,255,255,0.1)' } }}>
                            <SendIcon />
                        </IconButton>
                    </Box>
                </Paper>
            </Zoom>
        </Box>
    );
}
