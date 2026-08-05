import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Tab, Tabs } from 'react-bootstrap';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function MyQueries() {
    const { user } = useContext(AuthContext);
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const email = user?.email || user?.Email || '';

    useEffect(() => {
        if (!email) return;
        const fetchMyQueries = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await axios.get(`${API_BASE_URL}/api/supportqueries/byemail?email=${encodeURIComponent(email)}`);
                setQueries(res.data);
            } catch (err) {
                setError('Failed to load your queries. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchMyQueries();
    }, [email]);

    const pendingQueries = queries.filter(q => q.status === 'Pending');
    const answeredQueries = queries.filter(q => q.status === 'Answered');

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Container fluid className="py-4 px-4" style={{ minHeight: '100vh' }}>
            {/* Header */}
            <div className="mb-5">
                <h2 className="fw-bold mb-1">
                    <i className="bi bi-chat-left-text-fill text-primary me-2"></i>
                    My Support Queries
                </h2>
                <p className="text-secondary mb-0">Track the status of your queries and view expert replies.</p>
            </div>

            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="text-secondary mt-3">Loading your queries...</p>
                </div>
            )}

            {error && (
                <Alert variant="danger" className="border-0" style={{ background: 'rgba(255,82,82,0.15)' }}>
                    <i className="bi bi-exclamation-triangle me-2"></i>{error}
                </Alert>
            )}

            {!loading && !error && (
                <>
                    {/* Stats */}
                    <Row className="g-3 mb-5">
                        <Col md={4}>
                            <div className="p-4 rounded-4 text-center" style={{ background: 'rgba(41,121,255,0.12)', border: '1px solid rgba(41,121,255,0.2)' }}>
                                <h2 className="fw-bold text-primary mb-1">{queries.length}</h2>
                                <p className="text-secondary mb-0 small">Total Submitted</p>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="p-4 rounded-4 text-center" style={{ background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.2)' }}>
                                <h2 className="fw-bold text-warning mb-1">{pendingQueries.length}</h2>
                                <p className="text-secondary mb-0 small">Awaiting Reply</p>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="p-4 rounded-4 text-center" style={{ background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.2)' }}>
                                <h2 className="fw-bold text-success mb-1">{answeredQueries.length}</h2>
                                <p className="text-secondary mb-0 small">Answered</p>
                            </div>
                        </Col>
                    </Row>

                    {queries.length === 0 ? (
                        <div className="text-center py-5 glass-panel rounded-4">
                            <i className="bi bi-inbox text-secondary d-block mb-3" style={{ fontSize: '3rem' }}></i>
                            <h5 className="text-secondary">No queries submitted yet</h5>
                            <p className="text-secondary small">Use the "Contact Support" button on the dashboard to ask an agriculture expert.</p>
                        </div>
                    ) : (
                        <Tabs defaultActiveKey="answered" className="mb-4 nav-tabs-dark" id="my-queries-tabs">
                            <Tab eventKey="answered" title={<><i className="bi bi-check-circle-fill text-success me-2"></i>Answered ({answeredQueries.length})</>}>
                                {answeredQueries.length === 0 ? (
                                    <div className="text-center py-5 glass-panel rounded-4 mt-3">
                                        <i className="bi bi-hourglass-split text-secondary d-block mb-3" style={{ fontSize: '2.5rem' }}></i>
                                        <p className="text-secondary">No answered queries yet. Experts will reply soon!</p>
                                    </div>
                                ) : (
                                    <Row className="g-4 mt-1">
                                        {answeredQueries.map((q) => (
                                            <Col md={12} key={q.id}>
                                                <Card className="glass-panel border-0 text-white" style={{ borderLeft: '4px solid #00e676 !important' }}>
                                                    <Card.Body className="p-4">
                                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                                            <div>
                                                                <Badge bg="success" className="mb-2 px-3 py-1">
                                                                    <i className="bi bi-check-circle-fill me-1"></i> Answered
                                                                </Badge>
                                                                <h5 className="fw-bold mb-1">{q.title}</h5>
                                                                <small className="text-secondary">
                                                                    <i className="bi bi-clock me-1"></i>Submitted on {formatDate(q.createdAt)}
                                                                </small>
                                                            </div>
                                                        </div>

                                                        {/* Original Question */}
                                                        <div className="p-3 rounded-3 mb-3" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(41,121,255,0.6)' }}>
                                                            <p className="text-secondary small mb-1 fw-bold">
                                                                <i className="bi bi-person-fill text-primary me-1"></i>Your Question
                                                            </p>
                                                            <p className="mb-0">{q.description}</p>
                                                        </div>

                                                        {/* Expert Answer */}
                                                        {q.answer && (
                                                            <div className="p-3 rounded-3" style={{ background: 'rgba(0,230,118,0.08)', borderLeft: '3px solid #00e676' }}>
                                                                <p className="text-success small mb-1 fw-bold">
                                                                    <i className="bi bi-mortarboard-fill me-1"></i>Expert Reply
                                                                </p>
                                                                <p className="mb-0 text-white">{q.answer}</p>
                                                            </div>
                                                        )}
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                                )}
                            </Tab>

                            <Tab eventKey="pending" title={<><i className="bi bi-hourglass-split text-warning me-2"></i>Pending ({pendingQueries.length})</>}>
                                {pendingQueries.length === 0 ? (
                                    <div className="text-center py-5 glass-panel rounded-4 mt-3">
                                        <i className="bi bi-check-all text-success d-block mb-3" style={{ fontSize: '2.5rem' }}></i>
                                        <p className="text-secondary">All your queries have been answered!</p>
                                    </div>
                                ) : (
                                    <Row className="g-4 mt-1">
                                        {pendingQueries.map((q) => (
                                            <Col md={12} key={q.id}>
                                                <Card className="glass-panel border-0 text-white">
                                                    <Card.Body className="p-4">
                                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                                            <div>
                                                                <Badge bg="warning" text="dark" className="mb-2 px-3 py-1">
                                                                    <i className="bi bi-hourglass-split me-1"></i> Awaiting Reply
                                                                </Badge>
                                                                <h5 className="fw-bold mb-1">{q.title}</h5>
                                                                <small className="text-secondary">
                                                                    <i className="bi bi-clock me-1"></i>Submitted on {formatDate(q.createdAt)}
                                                                </small>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(255,193,7,0.6)' }}>
                                                            <p className="text-secondary small mb-1 fw-bold">
                                                                <i className="bi bi-chat-dots text-warning me-1"></i>Your Question
                                                            </p>
                                                            <p className="mb-0">{q.description}</p>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                                )}
                            </Tab>
                        </Tabs>
                    )}
                </>
            )}
        </Container>
    );
}
