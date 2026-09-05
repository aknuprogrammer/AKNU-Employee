import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export const FilterBar = ({ filters, setFilters, showSectionFilter = true }) => {
  const { user } = useAuth();

  const { data: sections } = useQuery({
    queryKey: ['sections-list'],
    queryFn: async () => {
      const res = await api.get('/sections');
      return res.data.data;
    },
    enabled: user?.role === 'master_admin' && showSectionFilter
  });

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-card p-4 rounded-lg border">
      {user?.role === 'master_admin' && showSectionFilter && (
        <div className="w-full sm:w-[200px]">
          <Select 
            value={filters.section_id} 
            onValueChange={(val) => setFilters({ ...filters, section_id: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections?.map(sec => (
                <SelectItem key={sec._id} value={sec._id}>{sec.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2 items-center w-full sm:w-auto">
        <Input 
          type="date" 
          value={filters.startDate} 
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="w-auto"
        />
        <span className="text-muted-foreground text-sm">to</span>
        <Input 
          type="date" 
          value={filters.endDate} 
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="w-auto"
        />
      </div>

      <div className="w-full sm:flex-1 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search records..." 
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="pl-9 w-full"
        />
      </div>
    </div>
  );
};

export default FilterBar;
