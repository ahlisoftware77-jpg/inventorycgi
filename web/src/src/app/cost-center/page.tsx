
'use client';

import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const costCenters = [
  { code: 'F1325', department: 'APP-R&D', sectionHead: 'Darmawan, Lai Fu Ming', manager: 'Mr. Dai' },
  { code: 'F1325-A', department: 'APP', sectionHead: 'Darmawan', manager: 'Mr. Dai' },
  { code: 'F1325-R', department: 'R&D', sectionHead: 'Lai Fu Ming', manager: 'Mr. Dai' },
  { code: 'F1324', department: 'LAB', sectionHead: 'Lai Fu Ming', manager: 'Mr. Dai' },
  { code: 'F1321', department: 'QC', sectionHead: 'Lai Fu Ming', manager: 'Mr. Dai' },
  { code: 'F1313', department: 'MIXER', sectionHead: 'M Suparman Nurjaya', manager: 'Mr. Li Deyi' },
  { code: 'F1323', department: 'PPIC', sectionHead: 'Warsito', manager: 'Mr. Li Deyi' },
  { code: 'F1312', department: 'FRIT', sectionHead: 'Agus Gito', manager: 'Mr. Li Deyi' },
  { code: 'F1322', department: 'MAINTENANCE', sectionHead: 'Warsito', manager: 'Mr. Li Deyi' },
  { code: 'F1314', department: 'TINTA', sectionHead: 'M Suparman Nurjaya', manager: 'Mr. Li Deyi' },
  { code: 'F0230', department: 'MARKETING', sectionHead: 'Kirwan', manager: 'Mrs.Ting' },
  { code: 'F0210', department: 'GA', sectionHead: 'Eko Prasetyo', manager: 'Mrs.Ting' },
  { code: 'F0220', department: 'ACCOUNTING', sectionHead: 'Mr. Wu', manager: 'Mrs.Ting' },
  { code: 'F0100', department: 'IT', sectionHead: 'Admin', manager: 'Mrs.Ting' },
  { code: 'F0300', department: 'PURCHASING', sectionHead: 'Elna', manager: 'Mrs.Ting' },
];

export default function CostCenterPage() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Pusat Biaya (Cost Center)</CardTitle>
          <CardDescription>
            Daftar kode pusat biaya dan departemen terkait.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] text-center">Kode</TableHead>
                <TableHead className="text-center">Departemen</TableHead>
                <TableHead className="text-center">Section Head</TableHead>
                <TableHead className="text-center">Manager</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.map((item) => (
                <TableRow key={item.code}>
                  <TableCell className="font-medium text-center">{item.code}</TableCell>
                  <TableCell className="text-center">{item.department}</TableCell>
                  <TableCell className="text-center">{item.sectionHead}</TableCell>
                  <TableCell className="text-center">{item.manager}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
