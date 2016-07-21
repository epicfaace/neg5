import Account from '../../models/sql-models/account';

export default (app) => {
    
    app.route('/api/account')
        .post((req, res) => {
            const accountCredentials = req.body;
            Account.create(accountCredentials)
                .then(user => {
                    return res.json({user: user, success: true});
                })
                .catch(error => {
                    return res.status(500).json({error: error, success: false});
            });
        })
        
    app.route('/api/authenticate')
        .post((req, res) => {
            const accountCredentials = req.body;
            Account.findOne(accountCredentials)
                .then(token => {
                    res.json({success: true, token: token})
                })
                .catch(errorMessage => {
                    console.log(errorMessage);
                    if (errorMessage.error) {
                        return res.status(500).json({success: false, error: errorMessage})
                    } else if (!errorMessage.authenticated) {
                        return res.status(403).json({success: false, authenticated: false})
                    }                  
                });
        });
    
}