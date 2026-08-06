import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, InputGroup, Spinner } from 'react-bootstrap';
import InsightsFooter from '../components/InsightsFooter';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function MandiSchemes() {
    const [searchQuery, setSearchQuery] = useState('');
    const [mandiPrices, setMandiPrices] = useState([]);
    const [loadingPrices, setLoadingPrices] = useState(true);

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

    const formatPrice = (val) => {
        return `₹${Number(val).toLocaleString('en-IN')}/q`;
    };

    const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <Container fluid className="p-0">
            <h2 className="text-white fw-bold mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-graph-up-arrow text-warning"></i> Mandi Prices
            </h2>

            <Row className="g-4 mb-4">
                {/* Full Width Live Mandi Prices Table */}
                <Col lg={12}>
                    <Card className="glass-panel border-0 text-white shadow-lg">
                        <Card.Body className="p-4 d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <h4 className="fw-bold mb-0">Live Mandi Prices</h4>
                                <Badge bg="danger" className="px-3 py-1 rounded-pill fw-bold">Live</Badge>
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
                                        placeholder="Search"
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
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <InsightsFooter />
        </Container>
    );
}
