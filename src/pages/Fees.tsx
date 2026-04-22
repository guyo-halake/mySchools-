import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ParentStudentFees } from './ParentStudentFees';
import { FeesManagement } from './FeesManagement';

export const Fees: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();

  // 🏛️ Administrative Flow (Principal / Admin)
  if (role === 'PRINCIPAL' || role === 'ADMIN') {
    return <FeesManagement />;
  }

  // 🏡 Family Flow (Parent / Student)
  return <ParentStudentFees />;
};
