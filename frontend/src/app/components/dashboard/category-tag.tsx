type PropsType = {
    categoryName: string,
    hexCode?: string
}

export default function CategoryTag({ categoryName, hexCode }: PropsType) {
    return (
        <div 
            className="inline-block p-1 rounded-md text-slate-700"
            style={{ 
                backgroundColor: hexCode || '#F1F1EF',
            }}
        >
            {categoryName}
        </div>
    )
}