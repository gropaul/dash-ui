import DuckDbProvider from "@/components/duck-db-provider";
import {Table} from "@/components/table";


export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <DuckDbProvider>
                <h1 className="text-3xl font-bold underline">
                    Hello DuckDB!
                </h1>
                <Table/>

            </DuckDbProvider>
        </main>
    );
}
