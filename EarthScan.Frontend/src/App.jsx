import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Button, Avatar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LandscapeIcon from '@mui/icons-material/Landscape';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ForumIcon from '@mui/icons-material/Forum';
import LogoutIcon from '@mui/icons-material/Logout';
import ChatIcon from '@mui/icons-material/Chat';
import GroupIcon from '@mui/icons-material/Group';

import DashboardHome from './pages/DashboardHome';
import LandSearch from './pages/LandSearch';
import Login from './pages/Login';
import Register from './pages/Register';
import BorewellPlanner from './pages/BorewellPlanner';
import CropFertilizer from './pages/CropFertilizer';
import MandiSchemes from './pages/MandiSchemes';
import SavedSearches from './pages/SavedSearches';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthContext, AuthProvider } from './context/AuthContext';
import AnswerQueries from './pages/AnswerQueries';
import ManageCropContent from './pages/ManageCropData';
import CompareLand from './pages/CompareLand';
import InvestmentAnalysis from './pages/InvestmentAnalysis';
import ManageUsers from './pages/ManageUsers';
import AnalyticsReports from './pages/AnalyticsReports';
import Forum from './pages/Forum';
import MyQueries from './pages/MyQueries';
import LanguageSelector from './components/LanguageSelector';
import Profile from './pages/Profile';
import AdminSupportQueries from './pages/AdminSupportQueries';

const drawerWidth = 260;

function MainLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleKey = (role) => {
    const map = {
      'Farmer': 'role_farmer',
      'Land Buyer': 'role_buyer',
      'Agriculture Expert': 'role_expert',
      'Admin': 'role_admin'
    };
    return map[role] || 'role_farmer';
  };

  let drawerItems = [];

  if (user) {
    const roleRaw = (user.role || user.Role || '').trim().toLowerCase();
    if (roleRaw === 'farmer') {
      drawerItems = [
        { text: t('sidebar.land_scanner'), icon: <DashboardIcon />, path: '/' },
        { text: t('sidebar.borewell_planner'), icon: <WaterDropIcon />, path: '/water' },
        { text: t('sidebar.crop_fertilizer'), icon: <LandscapeIcon />, path: '/crop' },
        { text: t('sidebar.mandi_schemes'), icon: <AssessmentIcon />, path: '/mandi' },
        { text: t('sidebar.forum'), icon: <ForumIcon />, path: '/forum' },
        { text: 'My Queries', icon: <ForumIcon />, path: '/my-queries' }
      ];
    } else if (roleRaw === 'land buyer') {
      drawerItems = [
        { text: t('sidebar.land_search'), icon: <DashboardIcon />, path: '/search' },
        { text: t('sidebar.compare_land'), icon: <LandscapeIcon />, path: '/buyer/compare' },
        { text: t('sidebar.investment_analysis'), icon: <AssessmentIcon />, path: '/buyer/analysis' },
        { text: t('sidebar.saved_searches'), icon: <ForumIcon />, path: '/saved' },
        { text: t('sidebar.forum'), icon: <ForumIcon />, path: '/forum' },
        { text: 'My Queries', icon: <ForumIcon />, path: '/my-queries' }
      ];
    } else if (roleRaw === 'agriculture expert') {
      drawerItems = [
        { text: t('sidebar.manage_crop'), icon: <LandscapeIcon />, path: '/expert/manage-crop' },
        { text: t('sidebar.mandi_schemes'), icon: <AssessmentIcon />, path: '/mandi' },
        { text: t('sidebar.forum'), icon: <ForumIcon />, path: '/forum' },
        { text: 'My Queries', icon: <ForumIcon />, path: '/my-queries' }
      ];
    } else if (roleRaw === 'admin') {
      drawerItems = [
        { text: 'Admin Dashboard', icon: <DashboardIcon />, path: '/admin' },
        { text: t('sidebar.manage_users'), icon: <GroupIcon />, path: '/admin/users' },
        { text: 'Support Queries', icon: <ChatIcon />, path: '/admin/queries' },
        { text: t('sidebar.analytics_reports'), icon: <AssessmentIcon />, path: '/admin/analytics' },
        { text: t('sidebar.forum'), icon: <ForumIcon />, path: '/forum' }
      ];
    } else {
      drawerItems = [
        { text: t('sidebar.dashboard'), icon: <DashboardIcon />, path: '/' }
      ];
    }
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0f18' }}>
      <Toolbar sx={{ my: 2 }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ color: '#00e676' }}>&#10022;</span> EarthScan <span style={{ color: '#2979ff' }}>Bharat</span>
        </Typography>
      </Toolbar>
      <List sx={{ px: 2, flexGrow: 1 }}>
        {drawerItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem 
              button 
              key={item.text} 
              component={Link} 
              to={item.path} 
              sx={{
                margin: '4px 0',
                borderRadius: '8px',
                background: isActive ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
                borderLeft: isActive ? '4px solid #00e676' : '4px solid transparent',
                color: isActive ? '#00e676' : '#a0aec0',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff'
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: '40px' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }} />
            </ListItem>
          )
        })}
      </List>
      
      {/* Language Selector in sidebar */}
      <Box sx={{ px: 2, pb: 2 }}>
        <LanguageSelector />
      </Box>

      {/* User Profile Area at bottom of sidebar */}
      {user && (
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              component={Link} 
              to="/profile"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', flexGrow: 1, minWidth: 0, '&:hover': { opacity: 0.8 } }}
            >
              <Avatar 
                src={(user.profilePicturePath || user.ProfilePicturePath) ? `${API_BASE_URL}${user.profilePicturePath || user.ProfilePicturePath}` : undefined}
                sx={{ bgcolor: '#00e676', color: '#0f172a', fontWeight: 'bold', width: 36, height: 36, flexShrink: 0 }}
              >
                {(user.name || user.Name)?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name || user.Name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                  {t(`sidebar.${getRoleKey(user.role || user.Role)}`)}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleLogout} title={t('sidebar.logout')} sx={{ color: '#a0aec0', flexShrink: 0, '&:hover': { color: '#ff5252' } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#0a0f18' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'transparent',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: '#fff' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
              borderRight: '1px solid rgba(255,255,255,0.05)',
              background: '#0a0f18'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 4 }, 
          width: { sm: `calc(100% - ${drawerWidth}px)` }, 
          minHeight: '100vh',
          background: '#0a0f18'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function App() {
  return (
    <>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={['Farmer', 'Land Buyer', 'Agriculture Expert', 'Admin']}>
          <MainLayout>
            <Profile />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      {/* Farmer & Shared Routes */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['Farmer']}>
          <MainLayout>
            <DashboardHome />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/water" element={
        <ProtectedRoute allowedRoles={['Farmer']}>
          <MainLayout>
            <BorewellPlanner />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/crop" element={
        <ProtectedRoute allowedRoles={['Farmer']}>
          <MainLayout>
            <CropFertilizer />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/mandi" element={
        <ProtectedRoute allowedRoles={['Farmer', 'Agriculture Expert']}>
          <MainLayout>
            <MandiSchemes />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/forum" element={
        <ProtectedRoute allowedRoles={['Farmer', 'Land Buyer', 'Agriculture Expert', 'Admin']}>
          <MainLayout>
            <Forum />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* Land Buyer Routes */}
      <Route path="/search" element={
        <ProtectedRoute allowedRoles={['Land Buyer']}>
          <MainLayout>
            <LandSearch />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/buyer/compare" element={
        <ProtectedRoute allowedRoles={['Land Buyer']}>
          <MainLayout>
            <CompareLand />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/buyer/analysis" element={
        <ProtectedRoute allowedRoles={['Land Buyer']}>
          <MainLayout>
            <InvestmentAnalysis />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/saved" element={
        <ProtectedRoute allowedRoles={['Land Buyer', 'Farmer']}>
          <MainLayout>
            <SavedSearches />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-queries" element={
        <ProtectedRoute allowedRoles={['Farmer', 'Land Buyer', 'Agriculture Expert']}>
          <MainLayout>
            <MyQueries />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* Agriculture Expert Routes */}
      <Route path="/expert/queries" element={
        <ProtectedRoute allowedRoles={['Agriculture Expert']}>
          <MainLayout>
            <AnswerQueries />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/expert/manage-crop" element={
        <ProtectedRoute allowedRoles={['Agriculture Expert']}>
          <MainLayout>
            <ManageCropContent />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <MainLayout>
            <AdminDashboard />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <MainLayout>
            <ManageUsers />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/queries" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <MainLayout>
            <AdminSupportQueries />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <MainLayout>
            <AnalyticsReports />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* Catch-all for other protected routes to show coming soon */}
      <Route path="*" element={
        <ProtectedRoute allowedRoles={['Farmer', 'Land Buyer', 'Agriculture Expert', 'Admin']}>
          <MainLayout>
            <Typography variant="h4" sx={{ color: '#fff', textAlign: 'center', mt: 10 }}>404 - Page Not Found</Typography>
          </MainLayout>
        </ProtectedRoute>
      } />
    </Routes>
    </>
  );
}

export default App;
