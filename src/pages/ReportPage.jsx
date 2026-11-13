import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLiveApi as useApi } from '../hooks.js';
import { Loader, ErrorBox } from '../components/ui.jsx';
import ReportView from '../components/ReportView.jsx';

export default function ReportPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading, reload } = useApi(`/reports/${id}`);
  return (
    <div>
      <button className="btn ghost sm mb" onClick={() => nav(-1)}><ArrowLeft size={16} /> Back</button>
      <ErrorBox error={error} />
      {loading && !data ? <Loader /> : data && <div className="panel"><ReportView data={data} onChange={reload} /></div>}
    </div>
  );
}
