import { useDispatch, useSelector } from 'react-redux';

// Typed hooks for better TypeScript-like usage
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

