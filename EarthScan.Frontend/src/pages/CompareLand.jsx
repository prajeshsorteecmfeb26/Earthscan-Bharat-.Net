import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge } from 'react-bootstrap';
import InsightsFooter from '../components/InsightsFooter';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CompareLand() {
    const [compareList, setCompareList] = useState([]);
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        const stored = sessionStorage.getItem('compareList');
        if (stored) {
            setCompareList(JSON.parse(stored));
        }
    }, []);

    const handleRemove = (id) => {
        const updated = compareList.filter(item => item.id !== id);
        setCompareList(updated);
        sessionStorage.setItem('compareList', JSON.stringify(updated));
    };

    const handleClearAll = () => {
        setCompareList([]);
        sessionStorage.removeItem('compareList');
    };

    const formatPrice = (price) => {
        return `₹${(price / 100000).toFixed(1)} Lakhs`;
    };

    return (
        <Container fluid className="p-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-white fw-bold mb-0">
                    <i className="bi bi-layout-split text-info"></i> {t('compare.title')}
                </h2>
                {compareList.length > 0 && (
                    <Button variant="outline-danger" className="rounded-pill hover-white" onClick={handleClearAll}>
                        <i className="bi bi-trash"></i> {t('compare.clear_all')}
                    </Button>
                )}
            </div>

            {compareList.length === 0 ? (
                <Card className="glass-panel border-0 text-white text-center p-5 mb-4">
                    <Card.Body>
                        <i className="bi bi-layout-split text-secondary mb-3" style={{ fontSize: '4rem' }}></i>
                        <h4 className="fw-bold">{t('compare.no_items')}</h4>
                        <p className="text-secondary">{t('compare.go_search')}</p>
                        <Button variant="primary" className="rounded-pill mt-3" onClick={() => navigate('/search')}>
                            Go to Land Search
                        </Button>
                    </Card.Body>
                </Card>
            ) : (
                <Card className="glass-panel border-0 text-white mb-4 overflow-hidden">
                    <div className="table-responsive">
                        <Table variant="dark" bordered className="mb-0 align-middle text-center compare-table" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                            <thead>
                                <tr>
                                    <th className="bg-transparent border-secondary text-secondary w-25">Features</th>
                                    {compareList.map(land => (
                                        <th key={land.id} className="bg-transparent border-secondary w-25 position-relative">
                                            <Button 
                                                variant="link" 
                                                className="text-danger position-absolute top-0 end-0 p-2" 
                                                onClick={() => handleRemove(land.id)}
                                            >
                                                <i className="bi bi-x-circle-fill fs-5"></i>
                                            </Button>
                                            <h5 className="fw-bold text-gradient mt-4 mb-2">{land.title}</h5>
                                            <p className="text-secondary small mb-0"><i className="bi bi-geo-alt text-danger"></i> {land.location}</p>
                                        </th>
                                    ))}
                                    {/* Fill empty columns if less than 3 */}
                                    {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                                        <th key={`empty-${i}`} className="bg-transparent border-secondary w-25">
                                            <div className="text-secondary p-4 opacity-50">
                                                <i className="bi bi-plus-circle fs-3 mb-2 d-block"></i>
                                                Add Property
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="bg-transparent border-secondary fw-bold text-start ps-4">Price</td>
                                    {compareList.map(land => (
                                        <td key={land.id} className="bg-transparent border-secondary fw-bold text-white fs-5">{formatPrice(land.price)}</td>
                                    ))}
                                    {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                                        <td key={`empty-p-${i}`} className="bg-transparent border-secondary"></td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="bg-transparent border-secondary fw-bold text-start ps-4">Size</td>
                                    {compareList.map(land => (
                                        <td key={land.id} className="bg-transparent border-secondary text-info fw-bold">{land.size} Acres</td>
                                    ))}
                                    {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                                        <td key={`empty-s-${i}`} className="bg-transparent border-secondary"></td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="bg-transparent border-secondary fw-bold text-start ps-4">Soil Type</td>
                                    {compareList.map(land => (
                                        <td key={land.id} className="bg-transparent border-secondary">{land.soil}</td>
                                    ))}
                                    {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                                        <td key={`empty-so-${i}`} className="bg-transparent border-secondary"></td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="bg-transparent border-secondary fw-bold text-start ps-4">Water Availability</td>
                                    {compareList.map(land => (
                                        <td key={land.id} className="bg-transparent border-secondary">{land.water}</td>
                                    ))}
                                    {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                                        <td key={`empty-w-${i}`} className="bg-transparent border-secondary"></td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="bg-transparent border-secondary fw-bold text-start ps-4">EarthScan Score</td>
                                    {compareList.map(land => (
                                        <td key={land.id} className="bg-transparent border-secondary">
                                            <Badge bg={land.score >= 80 ? 'success' : land.score >= 60 ? 'warning' : 'danger'} className="fs-6 px-3 py-2">
                                                {land.score}/100
                                            </Badge>
                                        </td>
                                    ))}
                                    {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                                        <td key={`empty-sc-${i}`} className="bg-transparent border-secondary"></td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="bg-transparent border-secondary fw-bold text-start ps-4">Tags</td>
                                    {compareList.map(land => (
                                        <td key={land.id} className="bg-transparent border-secondary">
                                            <div className="d-flex gap-1 justify-content-center flex-wrap">
                                                {land.tags.map((tag, idx) => (
                                                    <Badge bg={tag === 'Verified' ? 'success' : 'primary'} key={idx}>
                                                        {tag === 'Verified' && <i className="bi bi-patch-check-fill me-1"></i>}
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                    ))}
                                    {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                                        <td key={`empty-t-${i}`} className="bg-transparent border-secondary"></td>
                                    ))}
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                </Card>
            )}
            
            <InsightsFooter />
        </Container>
    );
}
