import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Container, Row, Col, Form, Button, Alert, Card, Modal } from 'react-bootstrap';
import LanguageSelector from '../components/LanguageSelector';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Farmer');
    const [phone, setPhone] = useState('');
    const [pincode, setPincode] = useState('');
    const [village, setVillage] = useState('');
    const [villages, setVillages] = useState([]);
    const [fetchingPin, setFetchingPin] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [showSuccess, setShowSuccess] = useState(false);
    const { register, user } = useContext(AuthContext);
    const navigate = useNavigate();

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

    const handleNameChange = (e) => {
        const value = e.target.value;
        setName(value);
        if (errors.name && value.trim().length >= 2) {
            setErrors(prev => {
                const next = { ...prev };
                delete next.name;
                return next;
            });
        }
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (errors.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(value)) {
                setErrors(prev => {
                    const next = { ...prev };
                    delete next.email;
                    return next;
                });
            }
        }
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (errors.password) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;
            if (passwordRegex.test(value)) {
                setErrors(prev => {
                    const next = { ...prev };
                    delete next.password;
                    return next;
                });
            }
        }
    };

    const handlePincodeChange = async (e) => {
        const val = e.target.value.replace(/\D/g, '').substring(0, 6);
        setPincode(val);
        
        if (val.length === 6) {
            setFetchingPin(true);
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
                const data = await res.json();
                if (data && data[0] && data[0].Status === 'Success') {
                    const postOffices = data[0].PostOffice;
                    const villageList = postOffices.map(po => po.Name).sort();
                    setVillages(villageList);
                    if (villageList.length > 0) {
                        setVillage(villageList[0]);
                    }
                } else {
                    setVillages([]);
                    setVillage('');
                }
            } catch (err) {
                console.error('Failed to fetch PIN details:', err);
                setVillages([]);
                setVillage('');
            } finally {
                setFetchingPin(false);
            }
        } else {
            setVillages([]);
            setVillage('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const newErrors = {};
        if (!name || name.trim().length < 2) {
            newErrors.name = 'Full name must be at least 2 characters long.';
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            newErrors.email = 'Please enter a valid email address.';
        }
        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;
        if (!password || !passwordRegex.test(password)) {
            newErrors.password = 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
        }

        if (phone && !/^\+?[0-9\s\-]{10,15}$/.test(phone)) {
            newErrors.phone = 'Please enter a valid phone number.';
        }

        if (pincode && pincode.length !== 6) {
            newErrors.pincode = 'Pincode must be exactly 6 digits.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        const result = await register(name, email, password, role, phone, village, pincode);
        if (result.success) {
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate('/login');
            }, 2000);
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
                                <h2 className="fw-bold mb-0">Create Account</h2>
                                <p className="text-secondary">Join EarthScan Bharat</p>
                            </div>

                            {error && <Alert variant="danger" className="border-0 bg-danger text-white bg-opacity-75">{error}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Full Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name}
                                        onChange={handleNameChange}
                                        required
                                        isInvalid={!!errors.name}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        placeholder="e.g. Arjun Singh"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.name}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        required
                                        isInvalid={!!errors.email}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        placeholder="e.g. arjun@example.com"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.email}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Mobile Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                                        required
                                        isInvalid={!!errors.phone}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        placeholder="e.g. +91 9876543210"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.phone}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">PIN Code</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={pincode}
                                        onChange={handlePincodeChange}
                                        required
                                        isInvalid={!!errors.pincode}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        placeholder="e.g. 411001"
                                    />
                                    {fetchingPin && <Form.Text className="text-info small">Fetching village list...</Form.Text>}
                                    <Form.Control.Feedback type="invalid">
                                        {errors.pincode}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Village / Area</Form.Label>
                                    {villages.length > 0 ? (
                                        <Form.Select
                                            value={village}
                                            onChange={(e) => setVillage(e.target.value)}
                                            className="bg-transparent text-white border-secondary shadow-none"
                                            style={{ backgroundColor: '#141d2b' }}
                                        >
                                            {villages.map((v, i) => (
                                                <option key={i} value={v} className="bg-dark">{v}</option>
                                            ))}
                                        </Form.Select>
                                    ) : (
                                        <Form.Control
                                            type="text"
                                            value={village}
                                            onChange={(e) => setVillage(e.target.value)}
                                            required
                                            className="bg-transparent text-white border-secondary shadow-none"
                                            placeholder="e.g. Rampur"
                                        />
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={password}
                                        onChange={handlePasswordChange}
                                        required
                                        isInvalid={!!errors.password}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        placeholder="Minimum 6 characters"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.password}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="text-secondary small">Role</Form.Label>
                                    <Form.Select 
                                        value={role} 
                                        onChange={(e) => setRole(e.target.value)}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        style={{ backgroundColor: '#141d2b' }}
                                    >
                                        <option value="Farmer" className="bg-dark">Farmer</option>
                                        <option value="Land Buyer" className="bg-dark">Land Buyer</option>
                                        <option value="Agriculture Expert" className="bg-dark">Agriculture Expert</option>
                                        <option value="Admin" className="bg-dark text-warning">Admin</option>
                                    </Form.Select>
                                </Form.Group>

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    className="w-100 py-2 fw-bold mb-3 border-0"
                                    style={{ background: 'linear-gradient(90deg, #2979ff, #1c54b2)' }}
                                >
                                    Sign Up
                                </Button>
                                
                                <div className="text-center mt-3">
                                    <span className="text-secondary small">Already have an account? </span>
                                    <Link to="/login" className="text-primary text-decoration-none small fw-bold">Log in here</Link>
                                </div>
                                <div className="text-center mt-3 d-flex justify-content-center gap-3">
                                    <Link to="/about" className="text-secondary text-decoration-none small hover-white">About Us</Link>
                                    <span className="text-secondary small">|</span>
                                    <Link to="/contact" className="text-secondary text-decoration-none small hover-white">Contact Us</Link>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showSuccess} centered contentClassName="bg-dark text-white border-success" backdrop="static">
                <Modal.Body className="text-center p-5">
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
                    <h3 className="mt-3 fw-bold">Registration Successful!</h3>
                    <p className="text-secondary mb-0">Redirecting to login...</p>
                </Modal.Body>
            </Modal>
        </Container>
        </div>
    );
}
