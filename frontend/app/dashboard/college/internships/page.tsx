'use client';
import { useEffect, useState } from 'react';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { DataTable } from '@/components/data-table';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';
export default function Page(){const [rows,setRows]=useState<any[]>([]);useEffect(()=>{fetchWithSession<any[]>('/api/college/internships').then(r=>setRows(r.data??[]));},[]);return <RoleDashboardShell allowedRoles={['COLLEGE_COORDINATOR']} title='Internship Governance' subtitle='Approve / reject / close and filter by department or status.'>{()=> <Card className='rounded-[24px] p-4'><DataTable title='Internships' rows={rows} columns={[{key:'title',label:'Title'},{key:'department_name',label:'Department'},{key:'status',label:'Status'},{key:'applications_count',label:'Applications'},{key:'filled_vacancy',label:'Filled'},{key:'total_vacancy',label:'Total'}] as any} /></Card>}</RoleDashboardShell>}
