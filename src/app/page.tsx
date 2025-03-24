import { supabase } from "@/lib/supabaseClient";

export default async function Home() {
  const { data, error } = await supabase.from("reservations").select("*");

  if (error) {
    console.error(error);
    return <div>エラーが発生しました</div>;
  }

  return (
    <div>
      <h1>Supabase テスト</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
