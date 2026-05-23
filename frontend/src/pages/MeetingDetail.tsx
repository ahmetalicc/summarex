import { useParams } from 'react-router-dom';

export default function MeetingDetail() {
  const { id } = useParams();
  return <main className="p-8">Meeting {id} (TODO)</main>;
}
