import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

export default function ManageUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState('');
    const tableRef = useRef();
    const { t } = useTranslation();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/admin/users`);
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setErrorMsg(error.response?.data?.message || error.message || 'Failed to fetch users');
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Are you sure you want to delete this user account permanently?')) {
            try {
                await axios.delete(`${API_BASE_URL}/api/admin/users/${id}`);
                setUsers(users.filter(user => user.id !== id));
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Failed to delete user.');
            }
        }
    };

    const handleEditClick = (user) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setShowModal(true);
    };

    const handleUpdateRole = async () => {
        try {
            await axios.put(`${API_BASE_URL}/api/admin/users/${selectedUser.id}`, { role: newRole });
            setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
            setShowModal(false);
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role.');
        }
    };

    const handleGeneratePDF = () => {
        const element = tableRef.current;
        const opt = {
            margin: 10,
            filename: 'User_Management_Report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        const buttons = element.querySelectorAll('.pdf-exclude');
        buttons.forEach(btn => btn.style.display = 'none');

        html2pdf().set(opt).from(element).save().then(() => {
            buttons.forEach(btn => btn.style.display = '');
        });
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'Admin': return 'warning';
            case 'Farmer': return 'success';
            case 'Land Buyer': return 'info';
            case 'Agriculture Expert': return 'primary';
            default: return 'secondary';
        }
    };

    return (
        <Container fluid className="p-0">
            <h2 className="text-white fw-bold mb-4">
                <i className="bi bi-people-fill text-primary"></i> {t('admin.manage_users')}
            </h2>

            <Card className="glass-panel border-0 text-white" ref={tableRef}>
                <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="fw-bold mb-0 text-secondary">All Registered Accounts</h5>
                        <Button 
                            variant="outline-light" 
                            className="rounded-pill px-4 hover-white pdf-exclude d-flex align-items-center gap-2"
                            onClick={handleGeneratePDF}
                        >
                            <i className="bi bi-file-earmark-pdf-fill text-danger"></i> {t('common.export_pdf')}
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center p-5 text-secondary">{t('common.loading')}</div>
                    ) : errorMsg ? (
                        <div className="text-center p-5 text-danger border border-danger rounded bg-danger bg-opacity-10">
                            <i className="bi bi-exclamation-triangle-fill fs-3 mb-2 d-block"></i>
                            {errorMsg}
                        </div>
                    ) : (
                        <Table variant="dark" hover responsive className="bg-transparent mb-0">
                            <thead>
                                <tr>
                                    <th className="text-secondary bg-transparent border-secondary">ID</th>
                                    <th className="text-secondary bg-transparent border-secondary">Name</th>
                                    <th className="text-secondary bg-transparent border-secondary">Email</th>
                                    <th className="text-secondary bg-transparent border-secondary">Role</th>
                                    <th className="text-secondary bg-transparent border-secondary text-end pdf-exclude">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="bg-transparent border-secondary">{user.id}</td>
                                        <td className="bg-transparent border-secondary fw-bold">{user.name}</td>
                                        <td className="bg-transparent border-secondary">{user.email}</td>
                                        <td className="bg-transparent border-secondary">
                                            <Badge bg={getRoleBadgeColor(user.role)}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="bg-transparent border-secondary text-end pdf-exclude">
                                            <div className="d-flex justify-content-end gap-2">
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="sm" 
                                                    className="rounded-pill px-3"
                                                    onClick={() => handleEditClick(user)}
                                                >
                                                    <i className="bi bi-pencil-square"></i> Edit Role
                                                </Button>
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm" 
                                                    className="rounded-pill px-3"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <i className="bi bi-trash-fill"></i> Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Edit Role Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="glass-panel text-white border-0">
                <Modal.Header closeButton closeVariant="white" className="border-secondary">
                    <Modal.Title><i className="bi bi-shield-lock"></i> Update User Role</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-secondary small">User Name</Form.Label>
                                <Form.Control type="text" value={selectedUser.name} disabled className="bg-transparent text-white border-secondary shadow-none" />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-secondary small">Email Address</Form.Label>
                                <Form.Control type="text" value={selectedUser.email} disabled className="bg-transparent text-white border-secondary shadow-none" />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-secondary small">Assign New Role</Form.Label>
                                <Form.Select 
                                    value={newRole} 
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="bg-transparent text-white border-secondary shadow-none"
                                >
                                    <option value="Farmer" className="bg-dark">Farmer</option>
                                    <option value="Land Buyer" className="bg-dark">Land Buyer</option>
                                    <option value="Agriculture Expert" className="bg-dark">Agriculture Expert</option>
                                    <option value="Admin" className="bg-dark">Admin</option>
                                </Form.Select>
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-secondary">
                    <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleUpdateRole}>Save Changes</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
