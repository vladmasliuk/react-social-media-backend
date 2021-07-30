//regular expretion for Email validation
const isEmail = (email) =>{
    const regulExp =/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(regulExp)) return true;
    else return false;
}
 
// if string is empty
const isNull = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

exports.validationRegistrationData = (data) =>{
    // validation for empty fields
    let errors = {};

    if(isNull(data.email)){
        errors.email = 'Please, enter your Email'
    } else if(!isEmail(data.email)){
        errors.email = 'This is not a Email'
    }

    if(isNull(data.password)){
        errors.password = 'Please, enter your Password'
    }

    if(data.password !== data.confPassword){
        errors.confPassword = 'Confirm pasword and password are not a same'
    }

    if(isNull(data.name)){
        errors.name = 'Please, enter your Name'
    }

    return{
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.validationLoginData = (data) => {
    let errors = {};

    if(isNull(data.email)){
        errors.email = 'Please, enter your Email'
    }
    
    if(isNull(data.password)){
        errors.password = 'Please, enter your Password'
    }
    
    return{
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    };
};

// user profile data
exports.smUserDat = (data) =>{
    let userDet = {};
    userDet.about = data.about;
    userDet.localization = data.localization;
    return userDet;
}