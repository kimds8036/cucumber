import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../constants/colors';

const links = ['아이디 찾기', '비밀번호 찾기', '회원가입'];

export const FooterLinks = () => (
  <View style={styles.container}>
    {links.map((link, index) => (
      <React.Fragment key={link}>
        <TouchableOpacity>
          <Text style={styles.link}>{link}</Text>
        </TouchableOpacity>
        {index < links.length - 1 && <Text style={styles.divider}>|</Text>}
      </React.Fragment>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  link: { color: colors.textSecondary, fontSize: 12 },
  divider: { color: colors.textSecondary, fontSize: 12, marginHorizontal: 8 },
});