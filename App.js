import React, { Component } from 'react';
import { AppRegistry, Text } from 'react-native';
import { Provider } from 'react-redux';
import store from './redux';
 
import Application from './src/pages/Application';
import Login from './src/pages/Login';
 
export default class Roadie extends Component {

	render() {
		return (
			<Provider store={store}>
				<Application />
			</Provider>
		)
	}
 
}

AppRegistry.registerComponent('Roadie', () => Roadie);