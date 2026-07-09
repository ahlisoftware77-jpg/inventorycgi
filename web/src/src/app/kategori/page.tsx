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

const assetCategories = [
    { name: 'A1-Lahan', lifetime: 99 },
    { name: 'A2-Peralatan Bangunan', lifetime: 30 },
    { name: 'A3-Peralatan Mesin', lifetime: 15 },
    { name: 'A4-Peralatan Listrik', lifetime: 10 },
    { name: 'A5-Peralatan Transportasi', lifetime: 10 },
    { name: 'A6-Peralatan Penelitian & Uji Lab', lifetime: 7 },
    { name: 'A9-Peralatan Lain-lain', lifetime: 5 },
    { name: 'Elektronik', lifetime: 5 },
    { name: 'Kendaraan', lifetime: 10 },
    { name: 'Furnitur', lifetime: 10 },
    { name: 'Peralatan Kantor', lifetime: 7 },
    { name: 'Lainnya', lifetime: undefined },
];

export default function KategoriPage() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Kategori Aset dan Masa Ketahanan</CardTitle>
          <CardDescription>
            Daftar kategori aset yang tersedia beserta standar masa ketahanannya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kategori</TableHead>
                <TableHead>Masa Ketahanan Aset</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetCategories.map((category) => (
                <TableRow key={category.name}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    {category.lifetime ? `${category.lifetime} tahun` : 'Tidak ditentukan'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
