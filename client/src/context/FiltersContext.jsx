import { createContext, useContext, useMemo, useReducer } from 'react';

const FiltersContext = createContext(null);

const INITIAL_STATE = {
  query: '',
  rarity: '',
  set: '',
  year: '',
  colors: [],
  type: '',
  legality: '',
  order: 'released',
  dir: 'desc',
  page: 1,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET': {
      const next = { ...state, [action.key]: action.value };
      if (action.key !== 'page') next.page = 1;
      return next;
    }
    case 'TOGGLE_COLOR': {
      const exists = state.colors.includes(action.value);
      const colors = exists
        ? state.colors.filter((c) => c !== action.value)
        : [...state.colors, action.value];
      return { ...state, colors, page: 1 };
    }
    case 'RESET':
      return { ...INITIAL_STATE };
    case 'HYDRATE':
      return { ...INITIAL_STATE, ...action.payload };
    default:
      return state;
  }
}

export function FiltersProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const api = useMemo(
    () => ({
      state,
      set: (key, value) => dispatch({ type: 'SET', key, value }),
      toggleColor: (value) => dispatch({ type: 'TOGGLE_COLOR', value }),
      reset: () => dispatch({ type: 'RESET' }),
      hydrate: (payload) => dispatch({ type: 'HYDRATE', payload }),
    }),
    [state],
  );

  return <FiltersContext.Provider value={api}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider');
  return ctx;
}
