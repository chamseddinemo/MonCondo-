interface DocumentFolder {
  _id: string
  name: string
  description?: string
  parentFolder?: string
  documentCount: number
  subfolderCount: number
}

interface FolderTreeProps {
  folders: DocumentFolder[]
  selectedFolder: string
  onFolderSelect: (folderId: string) => void
}

export default function FolderTree({ folders, selectedFolder, onFolderSelect }: FolderTreeProps) {
  const rootFolders = folders.filter(f => !f.parentFolder)

  const renderFolder = (folder: DocumentFolder, level: number = 0) => {
    const children = folders.filter(f => f.parentFolder === folder._id)
    const isSelected = selectedFolder === folder._id

    return (
      <div key={folder._id} className="mb-1">
        <button
          onClick={() => onFolderSelect(isSelected ? '' : folder._id)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between ${
            isSelected
              ? 'bg-blue-100 text-blue-900'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 1 + 0.75}rem` }}
        >
          <span className="flex items-center">
            <span className="mr-2">📁</span>
            {folder.name}
          </span>
          <span className="text-xs text-gray-500">
            {folder.documentCount}
          </span>
        </button>
        {children.length > 0 && (
          <div className="ml-2">
            {children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Dossiers</h3>
      {rootFolders.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun dossier</p>
      ) : (
        <div>
          <button
            onClick={() => onFolderSelect('')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm mb-2 ${
              !selectedFolder
                ? 'bg-blue-100 text-blue-900'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            📂 Tous les documents
          </button>
          {rootFolders.map(folder => renderFolder(folder))}
        </div>
      )}
    </div>
  )
}

