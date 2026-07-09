'use client';

import { type User } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { ChevronDown, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';

interface UserItemProps {
  user: User;
  isExpanded: boolean;
  onToggle: () => void;
}

const getRoleVariant = (role: User['role']) => {
    switch (role) {
        case 'Admin': return 'default';
        case 'Manager':
        case 'Section Head':
             return 'success';
        case 'Karyawan': return 'secondary';
        case 'User': return 'outline';
        case 'Pending': return 'destructive';
        default: return 'outline';
    }
};

const getInitials = (name?: string | null) => {
    if (!name) return '...';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2);
};


export default function UserItem({ user, isExpanded, onToggle }: UserItemProps) {
  const roleVariant = getRoleVariant(user.role);
  const displayName = user.displayName || user.name || user.email;

  return (
    <Card
      onClick={onToggle}
      className={cn(
        "p-3 cursor-pointer hover:bg-accent transition-colors shadow-sm",
        user.role === 'Pending' && 'blinking-destructive-border'
        )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Avatar>
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{displayName}</h3>
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span className="break-all">{user.email}</span>
              <span className="hidden sm:inline">•</span>
              <span>{user.department || 'Tanpa Dept.'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center shrink-0 self-end sm:self-center gap-4">
          <Badge variant={roleVariant}>{user.role}</Badge>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>
      </div>
    </Card>
  );
}
