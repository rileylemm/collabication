import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Theme } from '../styles/theme';

// Extend the default theme
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

export interface SearchPanelProps {
  isVisible: boolean;
  onSearch: (query: string, caseSensitive: boolean, regex: boolean, wholeWord: boolean) => void;
  onReplace?: (replacement: string) => void;
  onReplaceAll?: (replacement: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onClose: () => void;
  matchCount?: number;
  currentMatch?: number;
}

const PanelContainer = styled.div<{ isVisible: boolean }>`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 320px;
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  display: ${props => props.isVisible ? 'block' : 'none'};
  padding: 12px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const Title = styled.div`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const InputGroup = styled.div`
  margin-bottom: 12px;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 14px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const OptionsGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const OptionLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
`;

const StyledCheckbox = styled.input`
  cursor: pointer;
`;

const ActionsGroup = styled.div`
  display: flex;
  gap: 8px;
  justify-content: space-between;
`;

const ActionButton = styled.button`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
  
  &:hover {
    background-color: ${props => props.theme.colors.background};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(ActionButton)`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  
  &:hover {
    background-color: ${props => props.theme.colors.primary};
    opacity: 0.9;
  }
`;

const MatchStatus = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 8px;
  text-align: center;
`;

const SearchPanel: React.FC<SearchPanelProps> = ({
  isVisible,
  onSearch,
  onReplace,
  onReplaceAll,
  onNext,
  onPrevious,
  onClose,
  matchCount = 0,
  currentMatch = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Focus search input when panel becomes visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);
  
  // Handle search action
  const handleSearch = () => {
    if (searchQuery) {
      onSearch(searchQuery, caseSensitive, useRegex, wholeWord);
    }
  };
  
  // Handle key press in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  
  // Handle replace action
  const handleReplace = () => {
    if (onReplace && searchQuery) {
      onReplace(replacement);
    }
  };
  
  // Handle replace all action
  const handleReplaceAll = () => {
    if (onReplaceAll && searchQuery) {
      onReplaceAll(replacement);
    }
  };
  
  // Handle next match
  const handleNext = () => {
    if (onNext) {
      onNext();
    }
  };
  
  // Handle previous match
  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    }
  };
  
  // Toggle replace UI
  const toggleReplace = () => {
    setShowReplace(!showReplace);
  };
  
  return (
    <PanelContainer isVisible={isVisible}>
      <Header>
        <Title>{showReplace ? 'Find and Replace' : 'Find'}</Title>
        <CloseButton onClick={onClose}>×</CloseButton>
      </Header>
      
      <InputGroup>
        <StyledInput
          ref={searchInputRef}
          type="text"
          placeholder="Find..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </InputGroup>
      
      {showReplace && (
        <InputGroup>
          <StyledInput
            type="text"
            placeholder="Replace with..."
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          />
        </InputGroup>
      )}
      
      <OptionsGroup>
        <OptionLabel>
          <StyledCheckbox
            type="checkbox"
            checked={caseSensitive}
            onChange={() => setCaseSensitive(!caseSensitive)}
          />
          Case sensitive
        </OptionLabel>
        
        <OptionLabel>
          <StyledCheckbox
            type="checkbox"
            checked={useRegex}
            onChange={() => setUseRegex(!useRegex)}
          />
          Use regex
        </OptionLabel>
        
        <OptionLabel>
          <StyledCheckbox
            type="checkbox"
            checked={wholeWord}
            onChange={() => setWholeWord(!wholeWord)}
          />
          Whole word
        </OptionLabel>
      </OptionsGroup>
      
      <ActionsGroup>
        <div>
          <ActionButton onClick={toggleReplace}>
            {showReplace ? 'Hide Replace' : 'Replace'}
          </ActionButton>
        </div>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          {showReplace && (
            <>
              <ActionButton 
                onClick={handleReplace}
                disabled={!searchQuery || !onReplace}
              >
                Replace
              </ActionButton>
              <ActionButton 
                onClick={handleReplaceAll}
                disabled={!searchQuery || !onReplaceAll}
              >
                Replace All
              </ActionButton>
            </>
          )}
          
          <ActionButton 
            onClick={handlePrevious}
            disabled={!searchQuery || !onPrevious}
          >
            ↑
          </ActionButton>
          <ActionButton 
            onClick={handleNext}
            disabled={!searchQuery || !onNext}
          >
            ↓
          </ActionButton>
          <PrimaryButton onClick={handleSearch}>
            Find
          </PrimaryButton>
        </div>
      </ActionsGroup>
      
      {matchCount > 0 && (
        <MatchStatus>
          {currentMatch} of {matchCount} match{matchCount !== 1 ? 'es' : ''}
        </MatchStatus>
      )}
    </PanelContainer>
  );
};

export default SearchPanel; 