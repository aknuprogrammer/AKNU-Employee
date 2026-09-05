import api from "@/services/api";

export const employeeService = {
  getEmployees: async () => {
    const { data } = await api.get('/employees');
    return data;
  },
  getDepartments: async () => {
    const { data } = await api.get('/departments');
    return data;
  },
  createDepartment: async (name) => {
    const { data } = await api.post('/departments', { name });
    return data;
  },
  getCategories: async () => {
    const { data } = await api.get('/categories');
    return data;
  },
  createCategory: async (name) => {
    const { data } = await api.post('/categories', { name });
    return data;
  },
  createEmployee: async (employeeData) => {
    const { data } = await api.post('/employees', employeeData);
    return data;
  },
  updateEmployeeStatus: async (id, is_active) => {
    const { data } = await api.put(`/employees/${id}`, { is_active });
    return data;
  },
  bulkImport: async (payload) => {
    const { data } = await api.post('/employees/bulk', { employees: payload });
    return data;
  }
};
