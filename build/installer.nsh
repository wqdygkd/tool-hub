!macro TrimPathLine lineVar
  StrCpy $4 ${lineVar} -1
  StrCmp $4 "$\r" 0 +2
    StrCpy ${lineVar} ${lineVar} -1
  StrCpy $4 ${lineVar} -1
  StrCmp $4 "$\n" 0 +2
    StrCpy ${lineVar} ${lineVar} -1
!macroend

!macro DeleteDirectoryIfExists dirVar
  StrCmp ${dirVar} "" +3
    IfFileExists "${dirVar}\*.*" 0 +2
      RMDir /r "${dirVar}"
!macroend

!macro ReadLineFromFile targetVar pathFile
  StrCpy ${targetVar} ""
  IfFileExists "${pathFile}" 0 +9
    ClearErrors
    FileOpen $2 "${pathFile}" r
    IfErrors +7
    FileRead $2 ${targetVar}
    FileClose $2
    !insertmacro TrimPathLine ${targetVar}
!macroend

!macro LoadCustomDataDirInto targetVar
  !insertmacro ReadLineFromFile ${targetVar} "$APPDATA\${APP_PACKAGE_NAME}\data-root.path"
  StrCmp ${targetVar} "" 0 +3
    !ifdef APP_PRODUCT_FILENAME
      !insertmacro ReadLineFromFile ${targetVar} "$APPDATA\${APP_PRODUCT_FILENAME}\data-root.path"
    !endif
!macroend

!macro DeleteRoamingAppFolders
  RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
  !ifdef APP_PRODUCT_FILENAME
    IfFileExists "$APPDATA\${APP_PRODUCT_FILENAME}\*.*" 0 +2
      RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
  !endif
  IfFileExists "$APPDATA\${APP_FILENAME}\*.*" 0 +2
    RMDir /r "$APPDATA\${APP_FILENAME}"
!macroend

!macro customUnInstallSection
  Section "un.删除应用配置目录 ($APPDATA\${APP_PACKAGE_NAME})" un.DeleteAppConfig
    SetShellVarContext current
    DetailPrint "正在删除: $APPDATA\${APP_PACKAGE_NAME}"
    !insertmacro DeleteRoamingAppFolders
  SectionEnd

  Section /o "un.删除用户设置的数据目录" un.DeleteCustomSandboxData
    SetShellVarContext current
    !insertmacro LoadCustomDataDirInto $R9
    StrCmp $R9 "" skipCustomData
      DetailPrint "正在删除: $R9"
      !insertmacro DeleteDirectoryIfExists $R9
      Goto customDataDone
    skipCustomData:
      DetailPrint "未找到用户自定义数据目录配置，跳过"
    customDataDone:
  SectionEnd
!macroend
