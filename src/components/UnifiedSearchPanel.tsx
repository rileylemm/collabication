import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { 
  unifiedSearchService, 
  SearchResult, 
  SearchFilters, 
  FileSearchResult, 
  CommitSearchResult,
  FileNameSearchResult
} from '../services/unifiedSearchService';
import { useGitHub } from '../contexts/GitHubContext';
import { BiFile, BiGitCommit, BiSearch, BiX, BiFilterAlt } from 'react-icons/bi';
import { AiOutlineLoading } from 'react-icons/ai';

// Props for the UnifiedSearchPanel component
interface UnifiedSearchPanelProps {
  isVisible: boolean;
  onClose: () => void;
  defaultRepository?: string;
}

// Styled components
const PanelContainer = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Panel = styled.div`
  width: 70%;
  max-width: 1000px;
  max-height: 80vh;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.medium};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SearchContainer = styled.div`
  display: flex;
  flex: 1;
  position: relative;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.2rem;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  font-size: 1rem;
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}30;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 1rem;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const FiltersContainer = styled.div`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
`;

const FilterSelect = styled.select`
  padding: 0.25rem 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  font-size: 0.875rem;
`;

const FilterCheckbox = styled.input.attrs({ type: 'checkbox' })`
  cursor: pointer;
`;

const ResultsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
`;

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ResultItem = styled.div`
  padding: 0.75rem;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.theme.colors.background};
  }
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ResultIcon = styled.div`
  margin-right: 0.5rem;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.primary};
`;

const ResultPath = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResultLocation = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textTertiary};
  margin-left: 0.5rem;
`;

const ResultContent = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};
  white-space: pre-wrap;
  overflow: hidden;
  max-height: 5rem;
  position: relative;
`;

const CodeSnippet = styled.pre`
  margin: 0;
  font-family: monospace;
  font-size: 0.875rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.small};
  overflow-x: auto;
`;

const HighlightedText = styled.span`
  background-color: ${props => props.theme.colors.primary}30;
  font-weight: bold;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 0 2px;
`;

const StatusContainer = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const LoadingIcon = styled(AiOutlineLoading)`
  animation: spin 1s linear infinite;
  font-size: 2rem;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const UnifiedSearchPanel: React.FC<UnifiedSearchPanelProps> = ({
  isVisible,
  onClose,
  defaultRepository,
}) => {
  const navigate = useNavigate();
  const { repositories } = useGitHub();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // State variables
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRepository, setSelectedRepository] = useState<string>(defaultRepository || '');
  const [filters, setFilters] = useState<SearchFilters>({
    includeFiles: true,
    includeFileNames: true,
    includeCommits: true,
    caseSensitive: false,
    useRegex: false,
    maxResults: 100,
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // Focus search input when panel becomes visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);
  
  // Set default repository if provided
  useEffect(() => {
    if (defaultRepository) {
      setSelectedRepository(defaultRepository);
    } else if (repositories.length > 0 && !selectedRepository) {
      setSelectedRepository(repositories[0].name);
    }
  }, [defaultRepository, repositories, selectedRepository]);
  
  // Handle search function
  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedRepository) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const searchResults = await unifiedSearchService.search(
        selectedRepository,
        searchQuery,
        filters
      );
      setResults(searchResults);
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle key press in search input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  
  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'file' || result.type === 'filename') {
      // Navigate to editor with the file opened
      navigate(`/editor?repo=${result.repository}&file=${encodeURIComponent(result.path)}`);
      onClose();
    } else if (result.type === 'commit') {
      // Navigate to commit details (you may need to implement this)
      navigate(`/github?repo=${result.repository}&commit=${result.commitId}`);
      onClose();
    }
  };
  
  // Filter change handlers
  const handleFilterChange = (key: keyof SearchFilters, value: boolean | number | string[]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  // Render functions for different result types
  const renderFileResult = (result: FileSearchResult) => (
    <ResultItem key={`${result.path}-${result.line}-${result.column}`} onClick={() => handleResultClick(result)}>
      <ResultHeader>
        <ResultIcon><BiFile /></ResultIcon>
        <ResultPath>{result.path}</ResultPath>
        <ResultLocation>Line {result.line}</ResultLocation>
      </ResultHeader>
      <ResultContent>
        <CodeSnippet>
          {result.snippet.split('\n').map((line, i) => {
            // Check if this is the line with the match
            const isMatchLine = i === Math.min(2, result.line - (Math.max(0, result.line - 2) + 1));
            if (isMatchLine) {
              // Split the line into parts to highlight the matched text
              const parts: (string | JSX.Element)[] = [];
              let lastIndex = 0;
              
              // Reset regex state
              const regex = new RegExp(result.matchedText, filters.caseSensitive ? 'g' : 'gi');
              let match;
              
              while ((match = regex.exec(line)) !== null) {
                // Add text before the match
                if (match.index > lastIndex) {
                  parts.push(line.substring(lastIndex, match.index));
                }
                
                // Add the highlighted match
                parts.push(
                  <HighlightedText key={match.index}>
                    {match[0]}
                  </HighlightedText>
                );
                
                lastIndex = match.index + match[0].length;
              }
              
              // Add remaining text after the last match
              if (lastIndex < line.length) {
                parts.push(line.substring(lastIndex));
              }
              
              return (
                <div key={i} style={{ backgroundColor: isMatchLine ? 'rgba(255, 255, 0, 0.1)' : 'transparent' }}>
                  {parts}
                </div>
              );
            } else {
              return <div key={i}>{line}</div>;
            }
          })}
        </CodeSnippet>
      </ResultContent>
    </ResultItem>
  );
  
  const renderFileNameResult = (result: FileNameSearchResult) => (
    <ResultItem key={`filename-${result.path}`} onClick={() => handleResultClick(result)}>
      <ResultHeader>
        <ResultIcon><BiFile /></ResultIcon>
        <ResultPath>
          {result.path.split('/').map((part, i, arr) => {
            const isLast = i === arr.length - 1;
            
            if (isLast) {
              // Highlight the matching part in the filename
              const regex = new RegExp(result.matchedText, filters.caseSensitive ? 'g' : 'gi');
              const parts: (string | JSX.Element)[] = [];
              let lastIndex = 0;
              
              let match;
              while ((match = regex.exec(part)) !== null) {
                // Add text before the match
                if (match.index > lastIndex) {
                  parts.push(part.substring(lastIndex, match.index));
                }
                
                // Add the highlighted match
                parts.push(
                  <HighlightedText key={match.index}>
                    {match[0]}
                  </HighlightedText>
                );
                
                lastIndex = match.index + match[0].length;
              }
              
              // Add remaining text after the last match
              if (lastIndex < part.length) {
                parts.push(part.substring(lastIndex));
              }
              
              return <strong key={i}>{parts}</strong>;
            } else {
              return <span key={i}>{part}/</span>;
            }
          })}
        </ResultPath>
      </ResultHeader>
    </ResultItem>
  );
  
  const renderCommitResult = (result: CommitSearchResult) => (
    <ResultItem key={`commit-${result.commitId}`} onClick={() => handleResultClick(result)}>
      <ResultHeader>
        <ResultIcon><BiGitCommit /></ResultIcon>
        <ResultPath>
          Commit <strong>{result.commitId.substring(0, 7)}</strong>
        </ResultPath>
        <ResultLocation>
          {new Date(result.date * 1000).toLocaleDateString()}
        </ResultLocation>
      </ResultHeader>
      <ResultContent>
        {/* Highlight matching parts in commit message */}
        {(() => {
          const regex = new RegExp(result.matchedText, filters.caseSensitive ? 'g' : 'gi');
          const parts: (string | JSX.Element)[] = [];
          let lastIndex = 0;
          
          let match;
          while ((match = regex.exec(result.message)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
              parts.push(result.message.substring(lastIndex, match.index));
            }
            
            // Add the highlighted match
            parts.push(
              <HighlightedText key={match.index}>
                {match[0]}
              </HighlightedText>
            );
            
            lastIndex = match.index + match[0].length;
          }
          
          // Add remaining text after the last match
          if (lastIndex < result.message.length) {
            parts.push(result.message.substring(lastIndex));
          }
          
          return parts;
        })()}
      </ResultContent>
      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
        By: {result.author}
      </div>
    </ResultItem>
  );
  
  // Render a result based on its type
  const renderResult = (result: SearchResult) => {
    switch (result.type) {
      case 'file':
        return renderFileResult(result);
      case 'filename':
        return renderFileNameResult(result);
      case 'commit':
        return renderCommitResult(result);
      default:
        return null;
    }
  };
  
  return (
    <PanelContainer isVisible={isVisible} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelHeader>
          <SearchContainer>
            <SearchIcon>
              <BiSearch />
            </SearchIcon>
            <SearchInput
              ref={searchInputRef}
              type="text"
              placeholder="Search across files, commits, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </SearchContainer>
          <CloseButton onClick={onClose}>
            <BiX />
          </CloseButton>
        </PanelHeader>
        
        <FiltersContainer>
          <FilterGroup>
            <FilterSelect
              value={selectedRepository}
              onChange={(e) => setSelectedRepository(e.target.value)}
            >
              <option value="">Select Repository</option>
              {repositories.map(repo => (
                <option key={repo.id} value={repo.name}>
                  {repo.name}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>
          
          <FilterGroup>
            <BiFilterAlt style={{ color: '#666' }} />
            <FilterLabel>
              <FilterCheckbox
                checked={filters.includeFiles}
                onChange={(e) => handleFilterChange('includeFiles', e.target.checked)}
              />
              Files
            </FilterLabel>
            <FilterLabel>
              <FilterCheckbox
                checked={filters.includeFileNames}
                onChange={(e) => handleFilterChange('includeFileNames', e.target.checked)}
              />
              File Names
            </FilterLabel>
            <FilterLabel>
              <FilterCheckbox
                checked={filters.includeCommits}
                onChange={(e) => handleFilterChange('includeCommits', e.target.checked)}
              />
              Commits
            </FilterLabel>
          </FilterGroup>
          
          <FilterGroup>
            <FilterLabel>
              <FilterCheckbox
                checked={filters.caseSensitive}
                onChange={(e) => handleFilterChange('caseSensitive', e.target.checked)}
              />
              Case Sensitive
            </FilterLabel>
            <FilterLabel>
              <FilterCheckbox
                checked={filters.useRegex}
                onChange={(e) => handleFilterChange('useRegex', e.target.checked)}
              />
              Regex
            </FilterLabel>
          </FilterGroup>
        </FiltersContainer>
        
        <ResultsContainer>
          {isSearching ? (
            <StatusContainer>
              <LoadingIcon />
              <div>Searching...</div>
            </StatusContainer>
          ) : results.length > 0 ? (
            <ResultsList>
              {results.map(renderResult)}
            </ResultsList>
          ) : hasSearched ? (
            <StatusContainer>
              <div>No results found</div>
            </StatusContainer>
          ) : (
            <StatusContainer>
              <BiSearch style={{ fontSize: '2rem' }} />
              <div>Type a search query and press Enter</div>
            </StatusContainer>
          )}
        </ResultsContainer>
      </Panel>
    </PanelContainer>
  );
};

export default UnifiedSearchPanel; 