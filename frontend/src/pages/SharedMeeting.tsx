import { useParams } from 'react-router-dom';

export default function SharedMeeting() {
  const { token } = useParams();
  return <main className="p-8">Shared {token} (TODO)</main>;
}
