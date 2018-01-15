import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView
} from 'react-native';

const Container = props => {
  return (
    <View style={styles.labelContainer}>
      { props.children }
    </View>
  );
};

const styles = StyleSheet.create({
  labelContainer: {
    marginBottom: 20,
  }
});

export default Container;