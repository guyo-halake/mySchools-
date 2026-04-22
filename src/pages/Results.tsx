import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI';
import { ParentStudentResults } from './ParentStudentResults';

export const Results: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    return <ParentStudentResults />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h1 className="text-xl font-bold tracking-tight">Results</h1>
        <p className="text-sm text-zinc-500 mt-1">Use results management for teacher, principal, and admin workflows.</p>
        <div className="mt-4">
          <Link to="/results-management">
            <Button>Open Results Management</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
