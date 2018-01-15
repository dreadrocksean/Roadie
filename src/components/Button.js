import React, { Component } from 'react';

import {
  StyleSheet,
  Text,
  TouchableHighlight,
} from 'react-native';
 
const Button = props => {
     
    const getContent = () => {
        if (props.children) {
            return props.children;
        }
        return <Text style={[props.styles.title, styles.title]}>{props.title}</Text>
    }

 
    return (
        <TouchableHighlight 
            underlayColor="#ccc"
            onPress={props.onPress}
            style={[props.styles.button, styles.button]}
        >
            { getContent() }
        </TouchableHighlight>
    );
}
 
const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 20,
        color: '#FFF',
    },
});
 
export default Button;