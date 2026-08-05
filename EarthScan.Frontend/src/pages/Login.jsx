import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Form, Button, Alert, Card, Modal } from 'react-bootstrap';
import LanguageSelector from '../components/LanguageSelector';
import { API_BASE_URL } from '../config';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const userRole = user.role || user.Role;
            if (userRole === 'Admin') navigate('/admin');
            else if (userRole === 'Land Buyer') navigate('/search');
            else if (userRole === 'Agriculture Expert') navigate('/expert/queries');
            else navigate('/');
        }
    }, [user, navigate]);

    // Forgot Password State
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotErrors, setForgotErrors] = useState({});

    const handleForgotEmailChange = (e) => {
        const value = e.target.value;
        setForgotEmail(value);
        if (forgotErrors.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(value)) {
                setForgotErrors(prev => {
                    const next = { ...prev };
                    delete next.email;
                    return next;
                });
            }
        }
    };

    const handleNewPasswordChange = (e) => {
        const value = e.target.value;
        setNewPassword(value);
        if (forgotErrors.password) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;
            if (passwordRegex.test(value)) {
                setForgotErrors(prev => {
                    const next = { ...prev };
                    delete next.password;
                    return next;
                });
            }
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setForgotMessage('');
        setForgotError('');
        setForgotErrors({});

        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!forgotEmail || !emailRegex.test(forgotEmail)) {
            newErrors.email = 'Please enter a valid email address.';
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;
        if (!newPassword || !passwordRegex.test(newPassword)) {
            newErrors.password = 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
        }

        if (Object.keys(newErrors).length > 0) {
            setForgotErrors(newErrors);
            return;
        }

        setForgotLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, newPassword: newPassword })
            });
            const data = await response.json();
            
            if (response.ok) {
                setForgotMessage(data.message);
                setTimeout(() => {
                    setShowForgot(false);
                    setForgotMessage('');
                    setForgotEmail('');
                    setNewPassword('');
                    setForgotErrors({});
                }, 3000);
            } else {
                let errorMsg = data.message || 'Error resetting password';
                if (data.errors) {
                    const validationErrors = Object.values(data.errors).flat();
                    if (validationErrors.length > 0) {
                        errorMsg = validationErrors.join(' | ');
                    }
                }
                setForgotError(errorMsg);
            }
        } catch (err) {
            setForgotError('Network error. Please make sure the backend is running.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            const userRole = result.user?.role || result.user?.Role;
            if (userRole === 'Admin') navigate('/admin');
            else if (userRole === 'Land Buyer') navigate('/search');
            else if (userRole === 'Agriculture Expert') navigate('/expert/queries');
            else navigate('/');
        } else {
            setError(result.message);
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
        <LanguageSelector floating />
        <Container fluid className="d-flex align-items-center justify-content-center">
            <Row className="w-100 justify-content-center">
                <Col md={6} lg={4}>
                    <Card className="glass-panel text-white border-0 shadow-lg p-4">
                        <Card.Body>
                            <div className="text-center mb-4">
                                <h2 className="fw-bold mb-0">{t('login.welcome')}</h2>
                                <p className="text-secondary">{t('login.sign_in')}</p>
                            </div>

                            {error && <Alert variant="danger" className="border-0 bg-danger text-white bg-opacity-75">{error}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">{t('login.email')}</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        placeholder="enter your email"
                                        style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="text-secondary small mb-1">{t('login.password')}</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        placeholder="enter your password"
                                        style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                                    />
                                    <div className="d-flex justify-content-end mt-1">
                                        <Button variant="link" className="text-primary text-decoration-none small p-0 m-0 shadow-none" onClick={() => setShowForgot(true)}>
                                            {t('login.forgot_pass')}
                                        </Button>
                                    </div>
                                </Form.Group>

                                <Button 
                                    variant="success" 
                                    type="submit" 
                                    className="w-100 py-2 fw-bold mb-3 border-0"
                                    style={{ background: 'linear-gradient(90deg, #00e676, #00b259)' }}
                                >
                                    {t('login.login_btn')}
                                </Button>
                                
                                <div className="text-center mt-3">
                                    <span className="text-secondary small">{t('login.no_account')} </span>
                                    <Link to="/register" className="text-primary text-decoration-none small fw-bold">{t('login.sign_up')}</Link>
                                </div>
                                <div className="text-center mt-3 d-flex justify-content-center gap-3">
                                    <Link to="/about" className="text-secondary text-decoration-none small hover-white">{t('login.about')}</Link>
                                    <span className="text-secondary small">|</span>
                                    <Link to="/contact" className="text-secondary text-decoration-none small hover-white">{t('login.contact')}</Link>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>

        {/* Forgot Password Modal */}
        <Modal show={showForgot} onHide={() => setShowForgot(false)} centered contentClassName="bg-dark text-white border-secondary">
            <Modal.Header closeButton closeVariant="white" className="border-secondary">
                <Modal.Title>{t('login.reset_pass')}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleResetPassword}>
                <Modal.Body>
                    {forgotMessage && <Alert variant="success" className="py-2 small">{forgotMessage}</Alert>}
                    {forgotError && <Alert variant="danger" className="py-2 small border-0 bg-danger text-white bg-opacity-75">{forgotError}</Alert>}
                    <Form.Group className="mb-3">
                        <Form.Label className="small text-secondary">Email Address</Form.Label>
                        <Form.Control 
                            type="email" 
                            required 
                            isInvalid={!!forgotErrors.email}
                            className="bg-transparent text-white border-secondary shadow-none" 
                            value={forgotEmail} 
                            onChange={handleForgotEmailChange} 
                            placeholder="Enter your registered email"
                        />
                        <Form.Control.Feedback type="invalid">
                            {forgotErrors.email}
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="small text-secondary">New Password</Form.Label>
                        <Form.Control 
                            type="password" 
                            required 
                            isInvalid={!!forgotErrors.password}
                            className="bg-transparent text-white border-secondary shadow-none" 
                            value={newPassword} 
                            onChange={handleNewPasswordChange} 
                            placeholder="Enter new password"
                        />
                        <Form.Control.Feedback type="invalid">
                            {forgotErrors.password}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-secondary">
                    <Button variant="outline-light" onClick={() => setShowForgot(false)}>{t('login.cancel')}</Button>
                    <Button variant="success" type="submit" disabled={forgotLoading}>
                        {forgotLoading ? t('login.resetting') : t('login.reset_btn')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>

        </div>
    );
}
