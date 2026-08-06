import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Modal, Form, InputGroup, Tabs, Tab } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';

export default function AdminSupportQueries() {
    const { t } = useTranslation();
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Reply Modal States
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [selectedQuery, setSelectedQuery] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const fetchQueries = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${API_BASE_URL}/api/supportqueries`);
            setQueries(res.data);
        } catch (err) {
            console.error("Error fetching support queries:", err);
            setError('Failed to load support queries. Please make sure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueries();
    }, []);

    const handleOpenReplyModal = (query) => {
        setSelectedQuery(query);
        setReplyText(query.answer || '');
        setShowReplyModal(true);
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!selectedQuery || !replyText.trim()) return;

        setSendingReply(true);
        try {
            const res = await axios.put(`${API_BASE_URL}/api/supportqueries/${selectedQuery.id}/reply`, {
                reply: replyText.trim()
            });

            // Update local queries state instantly
            setQueries(prev => prev.map(q => q.id === selectedQuery.id ? { ...q, answer: replyText.trim(), status: 'Answered' } : q));
            alert('Reply sent successfully to user query!');
            setShowReplyModal(false);
            setSelectedQuery(null);
            setReplyText('');
        } catch (err) {
            console.error("Error sending reply:", err);
            alert(err.response?.data?.message || 'Failed to send reply. Please try again.');
        } finally {
            setSendingReply(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const pendingQueries = queries.filter(q => q.status === 'Pending');
    const answeredQueries = queries.filter(q => q.status === 'Answered');

    const filteredQueries = queries.filter(q => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        return (
            (q.farmer && q.farmer.toLowerCase().includes(term)) ||
            (q.email && q.email.toLowerCase().includes(term)) ||
            (q.title && q.title.toLowerCase().includes(term)) ||
            (q.description && q.description.toLowerCase().includes(term))
        );
    });

    const renderQueryList = (list) => {
        if (list.length === 0) {
            return (
                <div className="text-center py-5 glass-panel rounded-4">
                    <i className="bi bi-inbox text-secondary d-block mb-3" style={{ fontSize: '3rem' }}></i>
                    <h5 className="text-secondary">No queries found</h5>
                </div>
            );
        }

        return (
            <Row className="g-4">
                {list.map(q => (
                    <Col md={12} key={q.id}>
                        <Card className="glass-panel border-0 text-white shadow-sm" style={{ borderLeft: q.status === 'Answered' ? '4px solid #00e676' : '4px solid #ffc107' }}>
                            <Card.Body className="p-4">
                                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                                    <div>
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <Badge bg={q.status === 'Answered' ? 'success' : 'warning'} text={q.status === 'Answered' ? 'white' : 'dark'} className="px-3 py-1 fw-bold">
                                                {q.status === 'Answered' ? <><i className="bi bi-check-circle-fill me-1"></i> Answered</> : <><i className="bi bi-hourglass-split me-1"></i> Awaiting Reply</>}
                                            </Badge>
                                            <small className="text-secondary">
                                                <i className="bi bi-clock me-1"></i>{formatDate(q.createdAt)}
                                            </small>
                                        </div>
                                        <h5 className="fw-bold mb-1 text-white">{q.title}</h5>
                                    </div>
                                    <Button
                                        variant={q.status === 'Answered' ? 'outline-info' : 'success'}
                                        size="sm"
                                        className="fw-bold px-3 py-2 rounded-pill shadow-sm"
                                        onClick={() => handleOpenReplyModal(q)}
                                    >
                                        <i className={`bi ${q.status === 'Answered' ? 'bi-pencil-square' : 'bi-reply-fill'} me-1`}></i>
                                        {q.status === 'Answered' ? 'Edit Reply' : 'Reply to User'}
                                    </Button>
                                </div>

                                {/* User Info Header */}
                                <div className="p-2 px-3 rounded-3 mb-3 d-flex flex-wrap gap-4 align-items-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <span className="small text-secondary">
                                        <i className="bi bi-person-fill text-primary me-1"></i>
                                        <strong>User:</strong> <span className="text-white">{q.farmer || 'Anonymous'}</span>
                                    </span>
                                    <span className="small text-secondary">
                                        <i className="bi bi-envelope-fill text-info me-1"></i>
                                        <strong>Email:</strong> <span className="text-white">{q.email || 'N/A'}</span>
                                    </span>
                                    <span className="small text-secondary ms-auto">
                                        <i className="bi bi-tag-fill text-warning me-1"></i>
                                        <strong>ID:</strong> <span className="text-white">#{q.id}</span>
                                    </span>
                                </div>

                                {/* Query Message */}
                                <div className="p-3 rounded-3 mb-3" style={{ background: 'rgba(41,121,255,0.08)', borderLeft: '3px solid #2979ff' }}>
                                    <p className="text-primary small mb-1 fw-bold">
                                        <i className="bi bi-chat-left-text me-1"></i>Submitted Message
                                    </p>
                                    <p className="mb-0 text-light">{q.description}</p>
                                </div>

                                {/* Admin Reply Output */}
                                {q.answer && (
                                    <div className="p-3 rounded-3" style={{ background: 'rgba(0,230,118,0.08)', borderLeft: '3px solid #00e676' }}>
                                        <p className="text-success small mb-1 fw-bold">
                                            <i className="bi bi-patch-check-fill me-1"></i>Admin Reply Sent
                                        </p>
                                        <p className="mb-0 text-white">{q.answer}</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    };

    return (
        <Container fluid className="p-0">
            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                <div>
                    <h2 className="text-white fw-bold mb-1">
                        <i className="bi bi-headset text-warning me-2"></i> Support Queries & Helpdesk
                    </h2>
                    <p className="text-secondary mb-0">Review user queries submitted via Contact Us and provide official responses.</p>
                </div>
                <Button variant="outline-light" size="sm" onClick={fetchQueries} className="fw-bold px-3 rounded-pill">
                    <i className="bi bi-arrow-clockwise me-1"></i> Refresh Queries
                </Button>
            </div>

            {/* Stat Cards */}
            <Row className="g-3 mb-4">
                <Col md={4}>
                    <div className="p-4 rounded-4 text-center glass-panel" style={{ borderLeft: '4px solid #2979ff' }}>
                        <h2 className="fw-bold text-primary mb-1">{queries.length}</h2>
                        <p className="text-secondary mb-0 small font-semibold">Total Queries Received</p>
                    </div>
                </Col>
                <Col md={4}>
                    <div className="p-4 rounded-4 text-center glass-panel" style={{ borderLeft: '4px solid #ffc107' }}>
                        <h2 className="fw-bold text-warning mb-1">{pendingQueries.length}</h2>
                        <p className="text-secondary mb-0 small font-semibold">Awaiting Admin Reply</p>
                    </div>
                </Col>
                <Col md={4}>
                    <div className="p-4 rounded-4 text-center glass-panel" style={{ borderLeft: '4px solid #00e676' }}>
                        <h2 className="fw-bold text-success mb-1">{answeredQueries.length}</h2>
                        <p className="text-secondary mb-0 small font-semibold">Resolved & Answered</p>
                    </div>
                </Col>
            </Row>

            {/* Search Bar */}
            <Card className="glass-panel border-0 mb-4 text-white">
                <Card.Body className="p-3">
                    <InputGroup>
                        <InputGroup.Text className="bg-transparent border-secondary text-secondary">
                            <i className="bi bi-search"></i>
                        </InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Search queries by user name, email, or message keyword..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent text-white border-secondary shadow-none"
                        />
                        {searchTerm && (
                            <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>Clear</Button>
                        )}
                    </InputGroup>
                </Card.Body>
            </Card>

            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="warning" />
                    <p className="text-secondary mt-3">Fetching support queries...</p>
                </div>
            )}

            {error && (
                <Alert variant="danger" className="border-0 mb-4" style={{ background: 'rgba(255,82,82,0.15)' }}>
                    <i className="bi bi-exclamation-triangle me-2"></i>{error}
                </Alert>
            )}

            {!loading && !error && (
                <Tabs defaultActiveKey="all" className="mb-4 nav-tabs-dark" id="admin-queries-tabs">
                    <Tab eventKey="all" title={<><i className="bi bi-list-task me-2"></i>All Queries ({filteredQueries.length})</>}>
                        {renderQueryList(filteredQueries)}
                    </Tab>
                    <Tab eventKey="pending" title={<><i className="bi bi-hourglass-split text-warning me-2"></i>Pending ({pendingQueries.length})</>}>
                        {renderQueryList(pendingQueries.filter(q => {
                            const term = searchTerm.toLowerCase().trim();
                            if (!term) return true;
                            return (q.farmer && q.farmer.toLowerCase().includes(term)) || (q.email && q.email.toLowerCase().includes(term)) || (q.title && q.title.toLowerCase().includes(term));
                        }))}
                    </Tab>
                    <Tab eventKey="answered" title={<><i className="bi bi-check-circle-fill text-success me-2"></i>Answered ({answeredQueries.length})</>}>
                        {renderQueryList(answeredQueries.filter(q => {
                            const term = searchTerm.toLowerCase().trim();
                            if (!term) return true;
                            return (q.farmer && q.farmer.toLowerCase().includes(term)) || (q.email && q.email.toLowerCase().includes(term)) || (q.title && q.title.toLowerCase().includes(term));
                        }))}
                    </Tab>
                </Tabs>
            )}

            {/* Reply Modal */}
            <Modal show={showReplyModal} onHide={() => setShowReplyModal(false)} centered size="lg" contentClassName="glass-panel text-white border-0" style={{ background: 'rgba(10, 15, 24, 0.45)' }}>
                <Modal.Header closeButton closeVariant="white" className="border-secondary" style={{ backgroundColor: '#0d1527' }}>
                    <Modal.Title className="fw-bold text-warning">
                        <i className="bi bi-reply-fill me-2"></i>Reply to Support Query #{selectedQuery?.id}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ backgroundColor: '#0d1527' }}>
                    {selectedQuery && (
                        <Form onSubmit={handleSendReply}>
                            <div className="p-3 rounded-3 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Row className="g-2 text-secondary small mb-2">
                                    <Col md={6}><strong>From User:</strong> <span className="text-white">{selectedQuery.farmer}</span></Col>
                                    <Col md={6}><strong>Email Address:</strong> <span className="text-info">{selectedQuery.email}</span></Col>
                                    <Col md={12}><strong>Date:</strong> <span className="text-white">{formatDate(selectedQuery.createdAt)}</span></Col>
                                </Row>
                                <div className="mt-2 pt-2 border-top border-secondary border-opacity-25">
                                    <label className="text-primary small fw-bold mb-1">Original User Question:</label>
                                    <p className="mb-0 text-light bg-dark bg-opacity-50 p-2 rounded">{selectedQuery.description}</p>
                                </div>
                            </div>

                            <Form.Group className="mb-4">
                                <Form.Label className="text-white fw-bold">Your Response / Reply</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={5}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your official answer or resolution for the user..."
                                    required
                                    className="bg-transparent text-white border-secondary shadow-none"
                                />
                            </Form.Group>

                            {/* Quick Response Templates */}
                            <div className="mb-4">
                                <label className="text-secondary small fw-bold d-block mb-2">Quick Templates:</label>
                                <div className="d-flex flex-wrap gap-2">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        className="text-white"
                                        onClick={() => setReplyText("Thank you for reaching out to EarthScan. Our support team has reviewed your query and verified your account details.")}
                                    >
                                        General Response
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        className="text-white"
                                        onClick={() => setReplyText("Thank you for contacting support. For 7/12 land record verification, please ensure your document extract is clear and properly scanned.")}
                                    >
                                        7/12 Verification
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        className="text-white"
                                        onClick={() => setReplyText("Your query regarding soil health and crop fertilizer recommendations has been logged and forwarded to our agriculture experts.")}
                                    >
                                        Soil/Fertilizer Query
                                    </Button>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end gap-2">
                                <Button variant="outline-secondary" onClick={() => setShowReplyModal(false)}>
                                    Cancel
                                </Button>
                                <Button variant="success" type="submit" className="fw-bold px-4" disabled={sendingReply || !replyText.trim()}>
                                    {sendingReply ? <Spinner animation="border" size="sm" /> : <><i className="bi bi-send-fill me-1"></i> Send Reply</>}
                                </Button>
                            </div>
                        </Form>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
}
