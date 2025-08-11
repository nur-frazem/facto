export function H1Tittle({text, subtittle="", marginTop = "mt-8" }){
    return(
        <div className="justify-center items-center text-center flex flex-col">
            <h1 className={`inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight dark:text-slate-200 ${marginTop}`}>
                {text}
            </h1>
            <p className="mt-6 text-lg text-slate-600 text-center max-w-3xl mx-auto dark:text-slate-400">{subtittle}</p>
        </div>
        
    );
}

export function PSubtitle({text, marginTop = ""}){
    return(
        <p className={`mt-6 text-lg text-slate-600 text-center max-w-3xl mx-auto dark:text-slate-400 ${marginTop}`}>
            {text}
        </p>
    );
}