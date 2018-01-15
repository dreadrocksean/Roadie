import React, { Component } from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    Text,
    View,
    Image,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome';

import { login } from '../../redux/actions/auth';
import Container from '../components/Container';
import Button from '../components/Button';
import Label from '../components/Label';
import Logo from '../../assets/images/logo.png';

class Login extends Component {

    constructor (props) {
        super(props);
        this.state = {
            route: 'Login',
            username: '',
            password: ''
        };
    }

    forgot() {

    }
 
    userLogin (e) {
        this.props.onLogin(this.state.username, this.state.password);
        e.preventDefault();
    }
 
    toggleRoute (e) {
        let alt = (this.state.route === 'Login') ? 'SignUp' : 'Login';
        this.setState({ route: alt });
        e.preventDefault();
    }
 
    render () {
        let alt = (this.state.route === 'Login') ? 'SignUp' : 'Login';
        return (
            <ScrollView style={styles.scroll}>
                <Text style={{fontSize: 27, color: '#fff'}}>{this.state.route}</Text>
                <View style={styles.logoContainer}>
                    <Image resizeMode='contain' style={styles.logo} source={require('../../assets/images/logo.png')} />
                </View>
                <KeyboardAvoidingView behavior='padding' style={styles.fieldsContainer}>
                    <Container>
                        <TextInput
                            style={styles.textInput}
                            onSubmitEditing={() => this.passwordInput.focus()}
                            placeholder='Email' 
                            autoCorrect={false} 
                            autoFocus={true}
                            keyboardType='email-address' 
                            value={this.state.username}
                            returnKeyType='next'
                            onChangeText={text => this.setState({ username: text })}
                        />
                    </Container>
                    <Container>
                        <TextInput
                            secureTextEntry={true}
                            autoCapitalize='none'
                            ref={ input=> this.passwordInput = input }
                            autoCorrect={false}
                            value={this.state.password}
                            style={styles.textInput}
                            placeholder='Password' 
                            onChangeText={text => this.setState({ password: text })}
                            returnKeyType='go' 
                        />
                    </Container>
                </KeyboardAvoidingView>
                <Button
                    onPress={e => this.userLogin(e)}
                    title={this.state.route}
                    styles={{button: styles.primaryButton, title: styles.title}}
                />
                <Container>
                    <Text
                        style={styles.title}
                        onPress={e => this.forgot(e)}
                    >Forgot Login/Pass</Text>
                </Container>
                <Text style={{fontSize: 16, color: 'blue'}} onPress={e => this.toggleRoute(e)}>{alt}</Text>
            </ScrollView>
        );
    }

    /*render() {
        return (
            <ScrollView style={styles.scroll}>
                <View style={styles.logoContainer}>
                    <Image resizeMode='contain' style={styles.logo} source={require('../../assets/images/logo.png')} />
                </View>
                <KeyboardAvoidingView behavior='padding' style={styles.fieldsContainer}>
                    <Container>
                        <Button 
                            title='Forgot Login/Pass'
                            styles={{button: styles.alignRight, title: styles.title}} 
                            onPress={this.press.bind(this)} />
                    </Container>
                    <Container>
                        <TextInput
                            style={styles.textInput}
                            onSubmitEditing={() => this.passwordInput.focus()}
                            placeholder='Email' 
                            autoCorrect={false} 
                            keyboardType='email-address' 
                            returnKeyType='next'
                        />
                    </Container>
                    <Container>
                        <TextInput
                            secureTextEntry={true}
                            ref={ input=> this.passwordInput = input }
                            style={styles.textInput}
                            placeholder='Password' 
                            returnKeyType='go' 
                        />
                    </Container>
                </KeyboardAvoidingView>

                <View style={styles.footer}>
                    <Container>
                        <Button 
                            styles={{button: styles.transparentButton}}
                        >
                            <View style={styles.inline}>
                                <Icon name='facebook-official' size={30} color='#3B5699' />
                                <Text style={[styles.buttonBlueText, styles.buttonBigText]}>  Connect </Text> 
                                <Text style={styles.buttonBlueText}>with Facebook</Text>
                            </View>
                        </Button>
                    </Container>
                    <Container>
                        <Button 
                            title='Sign In'
                            styles={{button: styles.primaryButton, title: styles.buttonWhiteText}} 
                            onPress={this.props.onLoginPress} />
                    </Container>
                    <Container>
                        <Button 
                            title='CANCEL'
                            styles={{title: styles.buttonBlackText}} 
                            onPress={this.onCancel} />
                    </Container>
                </View>
            </ScrollView>
        );
    }*/
}

const styles = StyleSheet.create({
    fieldsContainer: {
        flex: 1,
    },
    scroll: {
        backgroundColor: '#000',
        padding: 30,
        flexDirection: 'column'
    },
    title: {
        color: '#0d8898',
        fontSize: 20
    },

    logoContainer:{
        alignItems: 'center',
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: 20,
    },
    logo: {
        position: 'relative',
        width: 300,
        height: 100
    },
    alignRight: {
        alignSelf: 'flex-end'
    },
    textInput: {
        height: 50,
        fontSize: 30,
        backgroundColor: 'rgba(225,225,225,0.8)',
        padding: 10,
    },
    buttonContainer: {
        backgroundColor: '#2980b6',
        paddingVertical: 15
    },
    transparentButton: {
        marginTop: 30,
        borderColor: '#3B5699',
        borderWidth: 2
    },
    buttonBlueText: {
        fontSize: 20,
        color: '#3B5699'
    },
    buttonBigText: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    inline: {
        flexDirection: 'row'
    },
    buttonWhiteText: {
        fontSize: 20,
        color: '#FFF',
    },
    buttonBlackText: {
        fontSize: 20,
        color: '#595856'
    },
    primaryButton: {
        backgroundColor: '#34A853'
    },
    footer: {
       marginTop: 40
    }
});


const mapStateToProps = (state, ownProps) => {
    return {
        isLoggedIn: state.auth.isLoggedIn
    };
};
 
const mapDispatchToProps = (dispatch) => {
    return {
        onLogin: (username, password) => { dispatch(login(username, password)); },
        onSignUp: (username, password) => { dispatch(signup(username, password)); }
    }
}
 
export default connect(mapStateToProps, mapDispatchToProps)(Login);