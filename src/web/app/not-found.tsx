import Link from "next/link";
import {buttonVariants} from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="mx-auto flex max-w-xl flex-col items-start px-4 py-32">
            <span className="font-mono text-sm text-muted-foreground">404</span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">There is no page here</h1>
            <Link href="/" className={buttonVariants({className: "mt-8"})}>Back to the start</Link>
        </div>
    );
}
