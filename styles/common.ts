import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#2B7BB0',
  success: '#4CAF50',
  danger: '#dc3545',
  warning: '#FF9800',
  info: '#2196F3',
  purple: '#9C27B0',
  brown: '#795548',
  background: '#f5f6fa',
  white: '#fff',
  black: '#000',
  gray: {
    50: '#f8f9fa',
    100: '#f5f6fa',
    200: '#eee',
    300: '#ddd',
    400: '#ccc',
    500: '#999',
    600: '#666',
    700: '#333',
  },
};

export const typography = {
  regular: 'FiraSans_400Regular',
  medium: 'FiraSans_500Medium',
  semibold: 'FiraSans_600SemiBold',
  bold: 'FiraSans_700Bold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  circle: 9999,
};

export const shadows = StyleSheet.create({
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});

export const layout = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const text = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontFamily: typography.semibold,
    color: colors.gray[700],
  },
  h2: {
    fontSize: 20,
    fontFamily: typography.semibold,
    color: colors.gray[700],
  },
  h3: {
    fontSize: 18,
    fontFamily: typography.semibold,
    color: colors.gray[700],
  },
  h4: {
    fontSize: 16,
    fontFamily: typography.semibold,
    color: colors.gray[700],
  },
  body: {
    fontSize: 14,
    fontFamily: typography.regular,
    color: colors.gray[700],
  },
  small: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.gray[600],
  },
  label: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
});

export const forms = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 13,
    fontFamily: typography.regular,
    color: colors.gray[700],
    backgroundColor: colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  selectText: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: colors.gray[700],
  },
});

export const buttons = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  success: {
    backgroundColor: colors.success,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  text: {
    color: colors.white,
    fontSize: 15,
    fontFamily: typography.semibold,
  },
  textOutline: {
    color: colors.gray[600],
    fontSize: 15,
    fontFamily: typography.semibold,
  },
});

export const cards = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    fontSize: 20,
    fontFamily: typography.semibold,
    color: colors.primary,
  },
});

export const tables = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerCell: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: colors.gray[600],
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    paddingVertical: spacing.md,
  },
  cell: {
    fontSize: 13,
    fontFamily: typography.regular,
    paddingHorizontal: spacing.md,
  },
});

export const tabs = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.xs,
    margin: spacing.lg,
    marginTop: 0,
    borderRadius: borderRadius.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: colors.gray[600],
  },
  activeText: {
    color: colors.white,
  },
});

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  text,
  forms,
  buttons,
  cards,
  tables,
  tabs,
};