import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Form, Button, Tabs, Tab } from 'react-bootstrap';
import InsightsFooter from '../components/InsightsFooter';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function AnswerQueries() {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const { t } = useTranslation();

    useEffect(() => {
        fetchQueries();
    }, []);

    const fetchQueries = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/supportqueries`);
            setQueries(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching queries:', err);
            setError('Failed to load support queries.');
            setLoading(false);
        }
    };

    const handleReply = (id) => {
        setReplyingTo(id);
        setReplyText('');
    };

    const submitReply = async (id) => {
        try {
            await axios.put(`${API_BASE_URL}/api/supportqueries/${id}/reply`, { reply: replyText });
            setQueries(queries.map(q => q.id === id ? { ...q, status: 'Answered', answer: replyText } : q));
            setReplyingTo(null);
            alert(t('queries.reply_sent') || 'Reply submitted successfully.');
        } catch (err) {
            console.error('Error submitting reply:', err);
            alert('Failed to submit reply. Please try again.');
        }
    };

    const pendingQueries = queries.filter(q => q.status === 'Pending');
    const answeredQueries = queries.filter(q => q.status === 'Answered');

    return (
        <Container fluid className="p-0">
            <h2 className="text-white fw-bold mb-4">
                <i className="bi bi-chat-dots text-primary"></i> {t('queries.title')}
            </h2>
            <Card className="glass-panel border-0 text-white mb-4">
                <Card.Body className="p-4">
                    {loading ? (
                        <div className="text-center p-5 text-secondary">
                            <div className="spinner-border text-primary mb-3" role="status"></div>
                            <h5>{t('common.loading') || 'Loading queries...'}</h5>
                        </div>
                    ) : error ? (
                        <div className="text-center p-5 text-danger border border-danger rounded bg-danger bg-opacity-10">
                            <i className="bi bi-exclamation-triangle-fill fs-3 mb-2 d-block"></i>
                            <h5>{error}</h5>
                        </div>
                    ) : (
                        <Tabs defaultActiveKey="pending" className="mb-4">
                            <Tab eventKey="pending" title={`${t('queries.pending_tab')} (${pendingQueries.length})`}>
                                <div className="d-flex flex-column gap-3 mt-3">
                                    {pendingQueries.length === 0 ? (
                                        <div className="text-center p-5 text-secondary">
                                            <i className="bi bi-check-circle display-4 mb-3 d-block"></i>
                                            <h5>{t('queries.all_caught_up')}</h5>
                                            <p>{t('queries.no_pending')}</p>
                                        </div>
                                    ) : (
                                        pendingQueries.map(q => (
                                            <Card key={q.id} className="bg-transparent border border-secondary shadow-sm">
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <h5 className="fw-bold mb-0 text-white">{q.title}</h5>
                                                        <Badge bg="warning" className="text-dark">{t('queries.pending_tab')}</Badge>
                                                    </div>
                                                    <p className="text-secondary small mb-3">
                                                        <i className="bi bi-person-circle"></i> {q.farmer} | <i className="bi bi-geo-alt"></i> {q.location}
                                                    </p>
                                                    <p className="text-light">{q.description}</p>
                                                    
                                                    {replyingTo === q.id ? (
                                                        <div className="mt-3 p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                                            <Form.Group className="mb-3">
                                                                <Form.Label className="small text-info"><i className="bi bi-pen"></i> {t('queries.expert_advice')}</Form.Label>
                                                                <Form.Control as="textarea" rows={3} className="bg-dark text-white border-secondary" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={t('queries.placeholder_reply')} />
                                                            </Form.Group>
                                                            <div className="d-flex gap-2 justify-content-end">
                                                                <Button variant="outline-light" size="sm" onClick={() => setReplyingTo(null)}>{t('common.cancel')}</Button>
                                                                <Button variant="primary" size="sm" onClick={() => submitReply(q.id)} disabled={!replyText.trim()}>{t('queries.send_reply')}</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Button variant="outline-primary" size="sm" onClick={() => handleReply(q.id)}>
                                                            <i className="bi bi-reply-fill"></i> {t('queries.write_reply')}
                                                        </Button>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </Tab>
                            <Tab eventKey="answered" title={`${t('queries.answered_tab')} (${answeredQueries.length})`}>
                                <div className="d-flex flex-column gap-3 mt-3">
                                    {answeredQueries.map(q => (
                                        <Card key={q.id} className="bg-transparent border border-secondary shadow-sm">
                                            <Card.Body>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <h5 className="fw-bold mb-0 text-white">{q.title}</h5>
                                                    <Badge bg="success">{t('queries.answered_tab')}</Badge>
                                                </div>
                                                <p className="text-secondary small mb-3">
                                                    <i className="bi bi-person-circle"></i> {q.farmer} | <i className="bi bi-geo-alt"></i> {q.location}
                                                </p>
                                                <p className="text-light mb-3">{q.description}</p>
                                                <div className="p-3 rounded border border-success" style={{ background: 'rgba(0, 230, 118, 0.05)' }}>
                                                    <div className="text-success small fw-bold mb-1"><i className="bi bi-shield-check"></i> {t('queries.expert_reply')}</div>
                                                    <p className="mb-0 text-light">{q.answer}</p>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    ))}
                                </div>
                            </Tab>
                        </Tabs>
                    )}
                </Card.Body>
            </Card>

            <InsightsFooter />
        </Container>
    );
}
