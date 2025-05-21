import React from 'react';
import { View } from 'react-native';

type AnimatedContainerProps = {
  children: React.ReactNode;
  style?: any;
};

/**
 * A custom hook that previously provided fade transitions
 * Now simplified to prevent flickering in forms
 */
export const useScreenTransition = () => {
  /**
   * Regular view container with no animations to prevent flickering
   */
  const AnimatedContainer = ({ children, style }: AnimatedContainerProps) => {
    return (
      <View style={style}>
        {children}
      </View>
    );
  };

  return { AnimatedContainer };
};

export default useScreenTransition; 