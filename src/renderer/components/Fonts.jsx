export function H1Tittle({text, marginTop = "mt-8" }){
    return(
        <h1 className={`inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight dark:text-slate-200 ${marginTop}`}>
            {text}
        </h1>
    );
}

export function PSubtitle({text, marginTop = ""}){
    return(
        <p className={`mt-6 text-lg text-slate-600 text-center max-w-3xl mx-auto dark:text-slate-400 ${marginTop}`}>
            {text}
        </p>
    );
}