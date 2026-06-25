/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Registration {
  id: string;
  name: string;
  email: string;
  mobile: string;
  department?: string;
  yearOfStudy?: string;
  isIeeeMember?: boolean;
  ieeeId?: string | null; // Optional if IEEE member is true
  timestamp: string; // ISO String or format
}

export interface AdminStats {
  totalRegistrations: number;
  countByDepartment: Record<string, number>;
  countByYear: Record<string, number>;
  countByIeeeStatus: { ieee: number; nonIeee: number };
  recentRegistrations: Registration[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
