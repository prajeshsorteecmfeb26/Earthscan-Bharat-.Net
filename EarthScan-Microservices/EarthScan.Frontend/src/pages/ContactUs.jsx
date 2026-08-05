import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import { AuthContext } from '../context/AuthContext';

export default function ContactUs() {
    const { user } = useContext(AuthContext);
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            setName(user.name || user.Name || '');
            setEmail(user.email || user.Email || '');
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSubmitted(false);
        setError('');

        try {
            const response = await axios.post(`${API_BASE_URL}/api/supportqueries`, {
                name,
                email,
                message
            });

            if (response.status === 200 || response.status === 201) {
                setSubmitted(true);
                setMessage('');
                setTimeout(() => setSubmitted(false), 5130);
            } else {
                setError(response.data?.message || 'Failed to send message.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error occurred while sending the message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: 'url("https://images.unsplash.com/photo-1592982537447-6f2a6a0a38cc?q=80&w=2070&auto=format&fit=crop") no-repeat center center fixed',
            backgroundSize: 'cover',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center'
        }}>
            <Container>
                <Row className="justify-content-center">
                    <Col md={10} lg={8}>
                        <Card className="glass-panel text-white border-0 shadow-lg p-5" style={{ background: 'rgba(10, 15, 24, 0.85)', backdropFilter: 'blur(10px)' }}>
                            <Card.Body>
                                <div className="text-center mb-5">
                                    <h1 className="fw-bold mb-2">{t('contact.title', 'Contact Us')}</h1>
                                    <p className="text-secondary">{t('contact.subtitle', "We'd love to hear from you. Drop us a message!")}</p>
                                </div>
                                <Row className="g-5">
                                    <Col md={6}>
                                        <Form onSubmit={handleSubmit}>
                                            {submitted && (
                                                <Alert variant="success" className="py-2 small border-0 bg-success text-white bg-opacity-75">
                                                    {t('contact.success', 'Your message has been sent successfully. We will get back to you soon!')}
                                                </Alert>
                                            )}
                                            {error && (
                                                <Alert variant="danger" className="py-2 small border-0 bg-danger text-white bg-opacity-75">
                                                    {error}
                                                </Alert>
                                            )}
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small text-secondary">{t('contact.form_name', 'Your Name')}</Form.Label>
                                                <Form.Control type="text" placeholder="John Doe" className="bg-transparent text-white border-secondary shadow-none" value={name} onChange={e => setName(e.target.value)} required />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small text-secondary">{t('contact.form_email', 'Email Address')}</Form.Label>
                                                <Form.Control type="email" placeholder="john@example.com" className="bg-transparent text-white border-secondary shadow-none" value={email} onChange={e => setEmail(e.target.value)} required />
                                            </Form.Group>
                                            <Form.Group className="mb-4">
                                                <Form.Label className="small text-secondary">{t('contact.form_msg', 'Message')}</Form.Label>
                                                <Form.Control as="textarea" rows={4} placeholder={t('contact.form_msg_placeholder', 'How can we help?')} className="bg-transparent text-white border-secondary shadow-none" value={message} onChange={e => setMessage(e.target.value)} required />
                                            </Form.Group>
                                            <Button type="submit" variant="primary" className="w-100 py-2 fw-bold border-0" style={{ background: 'linear-gradient(90deg, #2979ff, #1c54b2)' }} disabled={loading}>
                                                {loading ? t('contact.sending', 'Sending...') : t('contact.send_btn', 'Send Message')}
                                            </Button>
                                        </Form>
                                    </Col>
                                    <Col md={6}>
                                        <div className="d-flex flex-column gap-4 h-100 justify-content-center">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', background: 'rgba(41, 121, 255, 0.2)' }}>
                                                    <i className="bi bi-geo-alt-fill text-primary fs-4"></i>
                                                </div>
                                                <div>
                                                    <h6 className="fw-bold mb-1">{t('contact.office_title', 'Our Office')}</h6>
                                                    <p className="text-secondary small mb-0">{t('contact.office_val', 'Ministry of Agriculture & Farmers Welfare, Krishi Bhawan, Dr. Rajendra Prasad Road, New Delhi 110001')}</p>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', background: 'rgba(0, 230, 118, 0.2)' }}>
                                                    <i className="bi bi-envelope-fill text-success fs-4"></i>
                                                </div>
                                                <div>
                                                    <h6 className="fw-bold mb-1">{t('contact.email_title', 'Email Us')}</h6>
                                                    <p className="text-secondary small mb-0">agri-support@earthscanbharat.in</p>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-warning rounded-circle d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', background: 'rgba(255, 193, 7, 0.2)' }}>
                                                    <i className="bi bi-telephone-fill text-warning fs-4"></i>
                                                </div>
                                                <div>
                                                    <h6 className="fw-bold mb-1">{t('contact.call_title', 'Kisan Call Center (Toll-Free)')}</h6>
                                                    <p className="text-secondary small mb-0">1800-180-1551</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                                <div className="text-center mt-5">
                                    <Button onClick={() => navigate(-1)} variant="link" className="text-secondary text-decoration-none small shadow-none">{t('contact.back_btn', 'Go Back')}</Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
