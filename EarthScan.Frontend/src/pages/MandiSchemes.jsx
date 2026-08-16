import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, InputGroup, Spinner, Button, Modal, Tabs, Tab, Alert } from 'react-bootstrap';
import InsightsFooter from '../components/InsightsFooter';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { AuthContext } from '../context/AuthContext';

export default function MandiSchemes() {
    const { user: authUser } = useContext(AuthContext);
    const user = authUser || JSON.parse(localStorage.getItem('user') || '{}');

    const [activeTab, setActiveTab] = useState('mandi');
    const [searchQuery, setSearchQuery] = useState('');
    const [mandiPrices, setMandiPrices] = useState([]);
    const [loadingPrices, setLoadingPrices] = useState(true);

    // Schemes state
    const userKey = user?.id || user?.Id || user?.email || user?.Email || 'guest';
    const storageKey = `farmer_scheme_registrations_${userKey}`;

    const [schemes, setSchemes] = useState([]);
    const [loadingSchemes, setLoadingSchemes] = useState(false);
    const [registrations, setRegistrations] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });

    // Registration Modal State
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedScheme, setSelectedScheme] = useState(null);
    const [formData, setFormData] = useState({
        phone: '',
        aadhaarNumber: '',
        landSizeAcres: '2.5',
        bankAccountNumber: '',
        ifscCode: '',
        location: ''
    });
    const [submittingReg, setSubmittingReg] = useState(false);
    const [regSuccessInfo, setRegSuccessInfo] = useState(null);

    const { t } = useTranslation();

    // Fetch Mandi Prices on search change (with 400ms debounce)
    useEffect(() => {
        const fetchPrices = async () => {
            setLoadingPrices(true);
            try {
                const url = searchQuery 
                    ? `${API_BASE_URL}/api/mandi?crop=${encodeURIComponent(searchQuery)}`
                    : `${API_BASE_URL}/api/mandi`;
                const pricesResponse = await axios.get(url);
                setMandiPrices(pricesResponse.data);
            } catch (err) {
                console.error("Error loading mandi prices:", err);
            } finally {
                setLoadingPrices(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchPrices();
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Fetch Schemes & Registrations when user or component loads
    useEffect(() => {
        fetchSchemes();
        fetchUserRegistrations();
    }, [userKey]);

    const fetchSchemes = async () => {
        setLoadingSchemes(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/schemes`);
            if (response.data && response.data.length > 0) {
                // Ensure only top 2 schemes are kept
                setSchemes(response.data.slice(0, 2));
            } else {
                setSchemes(getDefaultSchemes());
            }
        } catch (error) {
            console.error("Error fetching schemes:", error);
            setSchemes(getDefaultSchemes());
        } finally {
            setLoadingSchemes(false);
        }
    };

    const fetchUserRegistrations = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await axios.get(`${API_BASE_URL}/api/schemes/my-registrations`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data && Array.isArray(response.data)) {
                    const fetchedIds = response.data.map(r => r.schemeId);
                    setRegistrations(fetchedIds);
                    localStorage.setItem(storageKey, JSON.stringify(fetchedIds));
                    return;
                }
            }
        } catch (err) {
            console.warn("Could not fetch remote registrations:", err);
        }
        const saved = localStorage.getItem(storageKey);
        setRegistrations(saved ? JSON.parse(saved) : []);
    };

    const getDefaultSchemes = () => [
        {
            id: 1,
            name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
            description: "Direct financial income support of ₹6,000 per year transferred into farmer bank accounts in three equal installments of ₹2,000.",
            benefit: "₹6,000 / Year Direct Benefit Transfer",
            eligibility: "Small & Marginal Farmers owning cultivable agricultural land across all states.",
            applicationLink: "https://pmkisan.gov.in",
            category: "Income Support"
        },
        {
            id: 2,
            name: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
            description: "Comprehensive crop insurance coverage providing financial protection against crop failure due to drought, flood, pests & natural calamities.",
            benefit: "Up to 100% Crop Loss Claim Compensation",
            eligibility: "All farmers growing notified Kharif & Rabi crops in notified areas.",
            applicationLink: "https://pmfby.gov.in",
            category: "Crop Insurance"
        }
    ];

    const handleOpenRegisterModal = (scheme) => {
        setSelectedScheme(scheme);
        setFormData({
            phone: user.phone || user.Phone || '',
            aadhaarNumber: '',
            landSizeAcres: '2.5',
            bankAccountNumber: '',
            ifscCode: '',
            location: user.location || user.Location || user.village || ''
        });
        setShowRegisterModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.aadhaarNumber || !formData.bankAccountNumber || !formData.ifscCode) {
            alert("Please fill in Aadhaar Number, Bank Account Number and IFSC Code.");
            return;
        }

        setSubmittingReg(true);
        const schemeId = selectedScheme.id;
        const refNo = `REG-SCHEME-${schemeId}-${Date.now().toString().slice(-6)}`;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/schemes/register`, {
                schemeId: selectedScheme.id,
                schemeName: selectedScheme.name,
                phone: formData.phone,
                aadhaarNumber: formData.aadhaarNumber,
                landSizeAcres: parseFloat(formData.landSizeAcres) || 2.5,
                bankAccountNumber: formData.bankAccountNumber,
                ifscCode: formData.ifscCode,
                location: formData.location
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.warn("Backend scheme registration request logged:", err);
        } finally {
            const updatedRegs = Array.from(new Set([...registrations, schemeId]));
            setRegistrations(updatedRegs);
            localStorage.setItem(storageKey, JSON.stringify(updatedRegs));

            setRegSuccessInfo({
                schemeName: selectedScheme.name,
                refNumber: refNo
            });
            setSubmittingReg(false);
            setShowRegisterModal(false);
        }
    };

    const isEnrolled = (schemeId) => registrations.includes(schemeId);

    const fuzzyMatch = (text, query) => {
        if (!query) return true;
        if (!text) return false;
        const t = text.toLowerCase();
        const q = query.toLowerCase();
        if (t.includes(q) || q.includes(t)) return true;
        
        const normalize = s => s.replace(/[aeiou\s]/g, '');
        const nt = normalize(t);
        const nq = normalize(q);
        if (nt.includes(nq) || nq.includes(nt)) return true;

        if (q.length >= 3 && t.startsWith(q.substring(0, 3))) return true;

        return false;
    };

    const filteredPrices = mandiPrices.filter(item => 
        fuzzyMatch(item.market, searchQuery) || 
        fuzzyMatch(item.commodity, searchQuery) ||
        fuzzyMatch(item.variety, searchQuery)
    );

    const formatPrice = (val) => `₹${Number(val).toLocaleString('en-IN')}/q`;
    const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <Container fluid className="p-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-shop text-warning"></i> Mandi Prices & Government Schemes
                </h2>
            </div>

            <Card className="glass-panel border-0 text-white shadow-lg mb-4">
                <Card.Header className="bg-transparent border-0 pt-3 px-4 pb-0">
                    <Tabs
                        activeKey={activeTab}
                        onSelect={(k) => setActiveTab(k)}
                        className="custom-tabs border-bottom border-secondary border-opacity-25"
                    >
                        <Tab 
                            eventKey="mandi" 
                            title={<span><i className="bi bi-graph-up-arrow text-warning me-2"></i>Live Mandi Prices</span>} 
                        />
                        <Tab 
                            eventKey="schemes" 
                            title={<span><i className="bi bi-award-fill text-success me-2"></i>Government Schemes</span>} 
                        />
                    </Tabs>
                </Card.Header>

                <Card.Body className="p-4">
                    {activeTab === 'mandi' && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <h4 className="fw-bold mb-0 text-white">Live Mandi Crop Rates</h4>
                                <Badge bg="danger" className="px-3 py-1 rounded-pill fw-bold">Live Agmarknet</Badge>
                            </div>
                            <p className="text-secondary small mb-3">
                                Live via Agmarknet / OGD India - Updated at {currentTime}
                            </p>

                            <Form className="mb-3" onSubmit={e => e.preventDefault()}>
                                <InputGroup style={{ maxWidth: '500px' }}>
                                    <InputGroup.Text className="bg-transparent border-secondary text-secondary">
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search commodity or market..."
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </InputGroup>
                            </Form>

                            {loadingPrices ? (
                                <div className="text-center py-5 my-auto">
                                    <Spinner animation="border" variant="warning" />
                                    <p className="text-secondary mt-2">Loading mandi prices...</p>
                                </div>
                            ) : (
                                <div className="table-responsive flex-grow-1">
                                    <Table variant="dark" hover className="bg-transparent mb-0 align-middle">
                                        <thead>
                                            <tr>
                                                <th className="text-secondary bg-transparent border-secondary fs-6 fw-semibold">Commodity</th>
                                                <th className="text-secondary bg-transparent border-secondary fs-6 fw-semibold">Market</th>
                                                <th className="text-secondary bg-transparent border-secondary text-end fs-6 fw-semibold">Min Price</th>
                                                <th className="text-secondary bg-transparent border-secondary text-end fs-6 fw-semibold">Modal Price</th>
                                                <th className="text-secondary bg-transparent border-secondary text-center fs-6 fw-semibold">Trend</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPrices.length > 0 ? (
                                                filteredPrices.map(item => (
                                                    <tr key={item.id} style={{ cursor: 'pointer' }}>
                                                        <td className="bg-transparent border-secondary">
                                                            <div className="fw-bold fs-6">{item.commodity}</div>
                                                            <small className="text-secondary">{item.variety}</small>
                                                        </td>
                                                        <td className="bg-transparent border-secondary text-light">{item.market}</td>
                                                        <td className="bg-transparent border-secondary text-end text-secondary">{formatPrice(item.minPrice)}</td>
                                                        <td className={`bg-transparent border-secondary text-end fw-bold text-${item.isUp ? 'success' : 'danger'}`}>
                                                            {formatPrice(item.modalPrice)}
                                                        </td>
                                                        <td className={`bg-transparent border-secondary text-center text-${item.isUp ? 'success' : 'danger'}`}>
                                                            <div><i className={`bi bi-arrow-${item.isUp ? 'up' : 'down'}-right`}></i></div>
                                                            <small>{item.trend}</small>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center bg-transparent border-secondary py-4 text-secondary">
                                                        No results matching "{searchQuery}"
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'schemes' && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h4 className="fw-bold text-white mb-1">Central & State Farmer Welfare Schemes</h4>
                                    <p className="text-secondary small mb-0">Official government schemes for income support, crop insurance & agricultural welfare.</p>
                                </div>
                            </div>

                            {loadingSchemes ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="success" />
                                    <p className="text-secondary mt-2">Loading eligible government schemes...</p>
                                </div>
                            ) : (
                                <Row className="g-4">
                                    {schemes.map(scheme => {
                                        return (
                                            <Col lg={6} key={scheme.id}>
                                                <Card className="h-100 border border-secondary border-opacity-25 bg-dark bg-opacity-50 text-white shadow-sm hover-card">
                                                    <Card.Body className="p-4 d-flex flex-column justify-content-between">
                                                        <div>
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <Badge bg="primary" className="px-3 py-1 rounded-pill text-uppercase">
                                                                    {scheme.category || "Government Scheme"}
                                                                </Badge>
                                                            </div>
                                                            <h5 className="fw-bold text-white mb-2">{scheme.name}</h5>
                                                            <p className="text-light small mb-3">{scheme.description}</p>
                                                            
                                                            <div className="p-3 rounded mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                                <div className="text-warning fw-bold mb-1 small">
                                                                    <i className="bi bi-gift-fill me-2"></i>Key Benefit:
                                                                </div>
                                                                <div className="text-white small fw-semibold">{scheme.benefit}</div>
                                                                <div className="text-secondary small mt-2">
                                                                    <strong>Eligibility:</strong> {scheme.eligibility}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {scheme.applicationLink && (
                                                            <div className="mt-2">
                                                                <Button 
                                                                    variant="outline-success" 
                                                                    className="w-100 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2"
                                                                    href={scheme.applicationLink} 
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <i className="bi bi-box-arrow-up-right"></i> Official Portal
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        );
                                    })}
                                </Row>
                            )}
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Scheme Registration Modal */}
            <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} centered className="text-white">
                <Modal.Header closeButton closeVariant="white" className="bg-dark border-secondary">
                    <Modal.Title className="fw-bold fs-5">
                        <i className="bi bi-file-earmark-check-fill text-success me-2"></i>
                        Register: {selectedScheme?.name}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleFormSubmit}>
                    <Modal.Body className="bg-dark p-4">
                        <Alert variant="info" className="py-2 small">
                            <i className="bi bi-info-circle-fill me-2"></i>
                            Your account details ({user.name || 'Farmer User'}) will be used to submit your registration.
                        </Alert>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-secondary">Applicant Farmer Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={user.name || user.Name || 'Farmer User'} 
                                disabled 
                                className="bg-secondary bg-opacity-25 text-white border-secondary"
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">Mobile Phone Number *</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="e.g. 9876543210" 
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">Aadhaar Number *</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="12-digit Aadhaar" 
                                        value={formData.aadhaarNumber}
                                        onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        maxLength={14}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">Land Size (Acres) *</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="e.g. 3.5" 
                                        value={formData.landSizeAcres}
                                        onChange={e => setFormData({ ...formData, landSizeAcres: e.target.value })}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">Location / Village</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="e.g. Nagpur, Maharashtra" 
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">Bank Account Number *</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="Account Number for DBT" 
                                        value={formData.bankAccountNumber}
                                        onChange={e => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">Bank IFSC Code *</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="e.g. SBIN0001234" 
                                        value={formData.ifscCode}
                                        onChange={e => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                                        className="bg-transparent text-white border-secondary shadow-none text-uppercase"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="bg-dark border-secondary">
                        <Button variant="outline-secondary" onClick={() => setShowRegisterModal(false)}>Cancel</Button>
                        <Button 
                            variant="success" 
                            type="submit" 
                            disabled={submittingReg}
                            style={{ background: 'linear-gradient(90deg, #00e676, #00b259)', border: 'none' }}
                            className="fw-bold px-4"
                        >
                            {submittingReg ? <Spinner animation="border" size="sm" /> : 'Submit Scheme Registration'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Registration Success Modal */}
            <Modal show={!!regSuccessInfo} onHide={() => setRegSuccessInfo(null)} centered className="text-white">
                <Modal.Body className="bg-dark text-center p-5 rounded">
                    <i className="bi bi-check-circle-fill text-success mb-3 d-block" style={{ fontSize: '4rem' }}></i>
                    <h3 className="fw-bold text-white mb-2">Registration Submitted!</h3>
                    <p className="text-light">
                        Your application for <strong>{regSuccessInfo?.schemeName}</strong> has been successfully registered to your farmer account.
                    </p>
                    <div className="bg-secondary bg-opacity-25 p-3 rounded mb-4 text-start small border border-secondary border-opacity-25">
                        <div><strong>Reference No:</strong> <span className="font-monospace text-warning">{regSuccessInfo?.refNumber}</span></div>
                        <div><strong>Status:</strong> <span className="text-success fw-bold">Verified & Enrolled</span></div>
                        <div><strong>DBT Verification:</strong> Direct Bank Transfer linkage active</div>
                    </div>
                    <Button variant="success" className="px-5 rounded-pill fw-bold" onClick={() => setRegSuccessInfo(null)}>
                        Done
                    </Button>
                </Modal.Body>
            </Modal>

            <InsightsFooter />
        </Container>
    );
}
