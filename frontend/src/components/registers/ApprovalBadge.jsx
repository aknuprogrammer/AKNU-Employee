import React from 'react';
import { Badge } from '@/components/ui/badge';

export const ApprovalBadge = ({ status }) => {
  const getVariant = (status) => {
    switch (status) {
      case 'Approved':
      case 'Completed':
      case 'Acknowledged':
      case 'Dispatched':
        return 'success';
      case 'Pending':
      case 'Pending Review':
      case 'Pending Approval':
      case 'In Progress':
        return 'warning';
      case 'Rejected':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStyle = (status) => {
    const variant = getVariant(status);
    if (variant === 'success') return 'bg-green-100 text-green-800 hover:bg-green-200';
    if (variant === 'warning') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    if (variant === 'destructive') return 'bg-red-100 text-red-800 hover:bg-red-200';
    return '';
  };

  return (
    <Badge className={getStyle(status)}>
      {status}
    </Badge>
  );
};
